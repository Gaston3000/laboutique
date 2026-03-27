import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { query } from "../db.js";
import { handleOrderStatusChange } from "../services/notificationService.js";

const ordersRouter = Router();
const allowedStatuses = [
  "nuevo",
  "pago",
  "preparado",
  "listo_retiro",
  "enviado",
  "entregado",
  "cancelado"
];

ordersRouter.get("/my-orders", requireAuth, async (req, res) => {
  try {
    const email = req.user.email;

    const ordersResult = await query(
      `SELECT o.id, o.wix_order_number, o.customer_name, o.contact_email,
          total_ars, status, shipping_method, delivery_time,
          shipping_city, shipping_method, o.created_at
       FROM orders o
       WHERE LOWER(o.contact_email) = LOWER($1)
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT 50`,
      [email]
    );

    const orderIds = ordersResult.rows.map((r) => r.id);
    let itemsByOrderId = {};

    if (orderIds.length > 0) {
      const itemsResult = await query(
        `SELECT order_id, product_id, variant_id, product_name, quantity, unit_price_ars, wix_variant
         FROM order_items
         WHERE order_id = ANY($1)
         ORDER BY order_id ASC, id ASC`,
        [orderIds]
      );

      itemsByOrderId = itemsResult.rows.reduce((acc, row) => {
        if (!acc[row.order_id]) acc[row.order_id] = [];
        acc[row.order_id].push({
          productId: row.product_id ? Number(row.product_id) : null,
          variantId: row.variant_id ? Number(row.variant_id) : null,
          productName: row.product_name,
          quantity: Number(row.quantity),
          unitPrice: Number(row.unit_price_ars),
          variant: row.wix_variant || null
        });
        return acc;
      }, {});
    }

    const items = ordersResult.rows.map((row) => ({
      id: row.id,
      wixOrderNumber: row.wix_order_number,
      customerName: row.customer_name,
      total: Number(row.total_ars),
      status: row.status,
      shippingMethod: row.shipping_method,
      deliveryTime: row.delivery_time,
      shippingCity: row.shipping_city,
      createdAt: row.created_at,
      lines: itemsByOrderId[row.id] || []
    }));

    return res.json({ items });
  } catch {
    return res.status(500).json({ error: "No se pudieron cargar tus pedidos" });
  }
});

ordersRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const ordersResult = await query(
          `SELECT o.id, o.wix_order_number, o.customer_name, o.customer_phone, o.customer_address,
            contact_email, customer_note, purchase_extra_data, order_items_count,
            total_ars, status, shipping_zone, shipping_method, delivery_time,
            recipient_name, recipient_phone, recipient_company,
            shipping_country, shipping_state, shipping_city, shipping_postal_code,
            billing_name, billing_phone, billing_company,
            billing_country, billing_state, billing_city, billing_address, billing_postal_code,
            payment_status, payment_method, fulfillment_status, tracking_number,
            fulfillment_service, shipping_label, currency,
            payment_card_amount_ars, shipping_cost_ars, tax_total_ars, net_amount_ars,
            discount_ars, promo_code, source, raw_payload, o.created_at,
            oi.invoice_number, oi.created_at AS invoice_created_at
       FROM orders o
       LEFT JOIN order_invoices oi ON oi.order_id = o.id
       ORDER BY o.created_at DESC, o.id DESC`
    );

    const itemsResult = await query(
          `SELECT order_id, product_name, quantity, unit_price_ars,
            wix_variant, wix_sku, refunded_quantity, item_weight,
            custom_text, deposit_amount_ars, raw_payload
       FROM order_items
       ORDER BY order_id ASC, id ASC`
    );

    const itemsByOrderId = itemsResult.rows.reduce((acc, row) => {
      if (!acc[row.order_id]) {
        acc[row.order_id] = [];
      }

      acc[row.order_id].push({
        productName: row.product_name,
        quantity: row.quantity,
        unitPrice: Number(row.unit_price_ars),
        variant: row.wix_variant,
        sku: row.wix_sku,
        refundedQuantity: Number(row.refunded_quantity || 0),
        weight: Number(row.item_weight || 0),
        customText: row.custom_text,
        depositAmount: Number(row.deposit_amount_ars || 0),
        rawPayload: row.raw_payload
      });

      return acc;
    }, {});

    const items = ordersResult.rows.map((row) => ({
      id: row.id,
      wixOrderNumber: row.wix_order_number,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerAddress: row.customer_address,
      contactEmail: row.contact_email,
      customerNote: row.customer_note,
      purchaseExtraData: row.purchase_extra_data,
      itemsCount: Number(row.order_items_count || 0),
      total: Number(row.total_ars),
      status: row.status,
      shippingZone: row.shipping_zone,
      shippingMethod: row.shipping_method,
      deliveryTime: row.delivery_time,
      recipientName: row.recipient_name,
      recipientPhone: row.recipient_phone,
      recipientCompany: row.recipient_company,
      shippingCountry: row.shipping_country,
      shippingState: row.shipping_state,
      shippingCity: row.shipping_city,
      shippingPostalCode: row.shipping_postal_code,
      billingName: row.billing_name,
      billingPhone: row.billing_phone,
      billingCompany: row.billing_company,
      billingCountry: row.billing_country,
      billingState: row.billing_state,
      billingCity: row.billing_city,
      billingAddress: row.billing_address,
      billingPostalCode: row.billing_postal_code,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      fulfillmentStatus: row.fulfillment_status,
      trackingNumber: row.tracking_number,
      fulfillmentService: row.fulfillment_service,
      shippingLabel: row.shipping_label,
      currency: row.currency,
      paymentCardAmount: Number(row.payment_card_amount_ars || 0),
      shippingCost: Number(row.shipping_cost_ars || 0),
      taxTotal: Number(row.tax_total_ars || 0),
      netAmount: Number(row.net_amount_ars || 0),
      discount: Number(row.discount_ars || 0),
      promoCode: row.promo_code,
      source: row.source,
      rawPayload: row.raw_payload,
      createdAt: row.created_at,
      invoiceNumber: row.invoice_number ? Number(row.invoice_number) : null,
      invoiceCreatedAt: row.invoice_created_at,
      lines: itemsByOrderId[row.id] || []
    }));

    return res.json({ items });
  } catch {
    return res.status(500).json({ error: "No se pudieron obtener los pedidos" });
  }
});

ordersRouter.post("/:id/invoice", requireAuth, requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "ID de pedido inválido" });
  }

  try {
    const orderResult = await query(
      `SELECT id, wix_order_number, created_at
       FROM orders
       WHERE id = $1`,
      [orderId]
    );

    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const invoiceResult = await query(
      `INSERT INTO order_invoices (order_id, invoice_number)
       VALUES ($1, nextval('order_invoice_number_seq'))
       ON CONFLICT (order_id)
       DO UPDATE SET order_id = order_invoices.order_id
       RETURNING id, order_id, invoice_number, created_at`,
      [orderId]
    );

    const invoice = invoiceResult.rows[0];

    return res.json({
      item: {
        id: invoice.id,
        orderId: invoice.order_id,
        orderNumber: order.wix_order_number,
        invoiceNumber: Number(invoice.invoice_number),
        issuedAt: invoice.created_at,
        orderCreatedAt: order.created_at
      }
    });
  } catch {
    return res.status(500).json({ error: "No se pudo generar la factura" });
  }
});

ordersRouter.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);
  const normalizedStatus = typeof req.body?.status === "string"
    ? req.body.status.trim().toLowerCase()
    : "";

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "ID de pedido inválido" });
  }

  if (!allowedStatuses.includes(normalizedStatus)) {
    return res.status(400).json({ error: "Estado de pedido inválido" });
  }

  const trackingNumber = typeof req.body?.trackingNumber === "string"
    ? req.body.trackingNumber.trim()
    : undefined;

  try {
    const { order } = await handleOrderStatusChange(orderId, normalizedStatus, {
      trackingNumber: trackingNumber || undefined
    });

    if (!order) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    return res.json({
      item: {
        id: order.orderId,
        customerName: order.customerName,
        total: order.totalArs,
        status: normalizedStatus,
        createdAt: order._raw?.created_at
      }
    });
  } catch (err) {
    console.error(`Error actualizando pedido #${orderId}:`, err.message);
    return res.status(500).json({ error: "No se pudo actualizar el pedido" });
  }
});

export default ordersRouter;
