/**
 * Central notification / order-status service.
 *
 * handleOrderStatusChange(orderId, newStatus, opts)
 *   1. Updates the DB status
 *   2. Sends the right email to customer (and optionally admin)
 *   3. Creates an admin notification row
 *   4. Prevents duplicate emails via order_email_log
 */

import { query } from "../db.js";
import { sendOrderEmail, sendAdminOrderEmail } from "./emailService.js";
import * as tpl from "./orderEmailTemplates.js";

// Status → event type mapping
const STATUS_EVENT_MAP = {
  nuevo: "ORDER_CREATED",
  pago: "PAYMENT_APPROVED",
  confirmado: "ORDER_CONFIRMED",
  preparado: "ORDER_PROCESSING",
  listo_retiro: "ORDER_READY_FOR_PICKUP",
  enviado: "ORDER_SHIPPED",
  entregado: "ORDER_DELIVERED",
  cancelado: "PAYMENT_FAILED",
};

// Status → admin notification message
const ADMIN_MESSAGES = {
  ORDER_CREATED: (o) => `Nuevo pedido #${o.id} de ${o.customer_name} por $${Number(o.total_ars).toLocaleString("es-AR")}`,
  CASH_ORDER_RECEIVED: (o) => `Pedido #${o.id} contra entrega de ${o.customer_name} por $${Number(o.total_ars).toLocaleString("es-AR")}`,
  PAYMENT_APPROVED: (o) => `Pago aprobado para pedido #${o.id} — ${o.customer_name}`,
  ORDER_CONFIRMED: (o) => `Pedido #${o.id} confirmado — ${o.customer_name}`,
  ORDER_PROCESSING: (o) => `Preparando pedido #${o.id} — ${o.customer_name}`,
  ORDER_READY_FOR_PICKUP: (o) => `Pedido #${o.id} listo para retiro — ${o.customer_name}`,
  ORDER_SHIPPED: (o) => `Pedido #${o.id} enviado — ${o.customer_name}`,
  ORDER_DELIVERED: (o) => `Pedido #${o.id} entregado — ${o.customer_name}`,
  PAYMENT_FAILED: (o) => `Pago rechazado para pedido #${o.id} — ${o.customer_name}`,
};

// Status → user email template builder
const USER_EMAIL_MAP = {
  // ORDER_CREATED: no customer email for MP orders (they get it on PAYMENT_APPROVED)
  CASH_ORDER_RECEIVED: tpl.cashOrderReceived,
  PAYMENT_APPROVED: tpl.paymentApproved,
  ORDER_CONFIRMED: tpl.orderConfirmed,
  ORDER_PROCESSING: tpl.orderProcessing,
  ORDER_READY_FOR_PICKUP: tpl.orderReadyForPickup,
  ORDER_SHIPPED: tpl.orderShipped,
  ORDER_DELIVERED: tpl.orderDelivered,
  PAYMENT_FAILED: tpl.paymentFailed,
};

// Events that also send an email to admins
const ADMIN_EMAIL_EVENTS = new Set(["ORDER_CREATED", "CASH_ORDER_RECEIVED"]);

/**
 * Load full order details needed for emails.
 */
async function loadOrderDetails(orderId) {
  const orderResult = await query(
    `SELECT o.id, o.customer_name, o.customer_phone, o.customer_address,
            o.contact_email, o.total_ars, o.shipping_cost_ars, o.discount_ars,
            o.promo_code, o.shipping_zone, o.shipping_method, o.status,
            o.payment_status, o.payment_method,
            o.tracking_number, o.fulfillment_service
     FROM orders o
     WHERE o.id = $1`,
    [orderId]
  );

  const order = orderResult.rows[0];
  if (!order) return null;

  const itemsResult = await query(
    `SELECT product_name, quantity, unit_price_ars
     FROM order_items
     WHERE order_id = $1
     ORDER BY id ASC`,
    [orderId]
  );

  const items = itemsResult.rows.map((r) => ({
    product_name: r.product_name,
    quantity: r.quantity,
    unit_price_ars: Number(r.unit_price_ars),
  }));

  const subtotal = items.reduce((s, i) => s + i.unit_price_ars * i.quantity, 0);

  return {
    orderId: order.id,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    contactEmail: order.contact_email,
    totalArs: Number(order.total_ars),
    subtotalArs: subtotal,
    shippingCostArs: Number(order.shipping_cost_ars || 0),
    discountArs: Number(order.discount_ars || 0),
    promoCode: order.promo_code,
    deliveryAddress: order.customer_address,
    shippingZone: order.shipping_zone,
    shippingMethod: order.shipping_method || "shipping",
    trackingNumber: order.tracking_number,
    carrier: order.fulfillment_service,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    items,
    _raw: order,
  };
}

/**
 * Returns true if this email type was already sent for this order.
 */
async function wasEmailSent(orderId, emailType) {
  const result = await query(
    "SELECT 1 FROM order_email_log WHERE order_id = $1 AND email_type = $2 LIMIT 1",
    [orderId, emailType]
  );
  return result.rows.length > 0;
}

/**
 * Record that an email was sent.
 */
async function logEmailSent(orderId, emailType, recipient) {
  await query(
    `INSERT INTO order_email_log (order_id, email_type, recipient)
     VALUES ($1, $2, $3)
     ON CONFLICT (order_id, email_type) DO NOTHING`,
    [orderId, emailType, recipient]
  );
}

/**
 * Create an admin notification row.
 */
async function createAdminNotification(orderId, eventType, message) {
  await query(
    `INSERT INTO order_notifications (order_id, event_type, message)
     VALUES ($1, $2, $3)`,
    [orderId, eventType, message]
  );
}

/**
 * Main entry point: handle an order status transition.
 *
 * @param {number}  orderId    – the order id
 * @param {string}  newStatus  – target status (nuevo, pago, confirmado, etc.)
 * @param {object}  [opts]     – optional overrides
 * @param {boolean} [opts.skipDbUpdate]   – true when the DB was already updated (e.g. webhook)
 * @param {boolean} [opts.skipEmail]      – true to suppress email sending
 * @param {boolean} [opts.isCashOrder]    – true for cash-on-delivery orders
 * @param {string}  [opts.trackingNumber] – include tracking number for shipped status
 * @returns {Promise<{order: object, event: string}>}
 */
export async function handleOrderStatusChange(orderId, newStatus, opts = {}) {
  const { skipDbUpdate = false, skipEmail = false, isCashOrder = false, trackingNumber } = opts;

  // 1. Update DB if not already done
  if (!skipDbUpdate) {
    const updateFields = ["status = $1"];
    const updateParams = [newStatus, orderId];

    if (trackingNumber && newStatus === "enviado") {
      updateFields.push("tracking_number = $3");
      updateParams.push(trackingNumber);
    }

    const result = await query(
      `UPDATE orders SET ${updateFields.join(", ")} WHERE id = $2 RETURNING id`,
      updateParams
    );

    if (!result.rows[0]) {
      throw new Error(`Pedido #${orderId} no encontrado`);
    }
  }

  // 2. Determine event type
  //    For cash-on-delivery orders created with status "nuevo" → CASH_ORDER_RECEIVED
  //    For MP orders created with status "nuevo" → ORDER_CREATED (admin only, no customer email)
  let eventType = STATUS_EVENT_MAP[newStatus];
  if (!eventType) return { order: null, event: null };

  if (eventType === "ORDER_CREATED" && isCashOrder) {
    eventType = "CASH_ORDER_RECEIVED";
  }

  // 3. Load full order details
  const details = await loadOrderDetails(orderId);
  if (!details) return { order: null, event: eventType };

  if (trackingNumber) {
    details.trackingNumber = trackingNumber;
  }

  // 4. Create admin notification
  const adminMsg = ADMIN_MESSAGES[eventType];
  if (adminMsg) {
    try {
      await createAdminNotification(orderId, eventType, adminMsg(details._raw));
    } catch (err) {
      console.error(`⚠️ Error creando notificación admin para pedido #${orderId}:`, err.message);
    }
  }

  // 5. Send user email (if not already sent and not skipped)
  //    ORDER_CREATED has no user template → customer only gets emailed on PAYMENT_APPROVED or CASH_ORDER_RECEIVED
  if (!skipEmail && details.contactEmail) {
    const templateBuilder = USER_EMAIL_MAP[eventType];
    if (templateBuilder) {
      const emailType = `user_${eventType}`;
      try {
        const alreadySent = await wasEmailSent(orderId, emailType);
        if (!alreadySent) {
          const { subject, html } = templateBuilder(details);
          await sendOrderEmail(details.contactEmail, subject, html);
          await logEmailSent(orderId, emailType, details.contactEmail);
          console.log(`✅ Email ${eventType} enviado a ${details.contactEmail} para pedido #${orderId}`);
        } else {
          console.log(`ℹ️ Email ${eventType} ya fue enviado para pedido #${orderId}, omitido`);
        }
      } catch (err) {
        console.error(`⚠️ Error enviando email ${eventType} para pedido #${orderId}:`, err.message);
      }
    }
  }

  // 6. Send admin email for certain events
  if (!skipEmail && ADMIN_EMAIL_EVENTS.has(eventType)) {
    const adminEmailType = `admin_${eventType}`;
    try {
      const alreadySent = await wasEmailSent(orderId, adminEmailType);
      if (!alreadySent) {
        const { subject, html } = tpl.adminNewOrder(details);
        await sendAdminOrderEmail(subject, html);
        await logEmailSent(orderId, adminEmailType, "admin");
        console.log(`✅ Email admin ${eventType} enviado para pedido #${orderId}`);
      }
    } catch (err) {
      console.error(`⚠️ Error enviando email admin para pedido #${orderId}:`, err.message);
    }
  }

  return { order: details, event: eventType };
}
