import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { query } from "../db.js";
import { handleOrderStatusChange } from "../services/notificationService.js";
import { refundPayment } from "../services/mercadopago.js";

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

// Transiciones válidas del state machine de pedidos
// nuevo → preparado está permitido para pedidos con pago contra entrega/retiro (sin MP)
const VALID_TRANSITIONS = {
  nuevo:        ["pago", "preparado", "cancelado"],
  pago:         ["preparado", "cancelado"],
  preparado:    ["listo_retiro", "enviado", "cancelado"],
  listo_retiro: ["entregado", "cancelado"],
  enviado:      ["entregado", "cancelado"],
  entregado:    [],
  cancelado:    [],
};

const ORDER_STATUS_LABELS = {
  nuevo: "Nuevo",
  pago: "Pagado",
  preparado: "En preparación",
  listo_retiro: "Listo para retirar",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

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
            discount_ars, surcharge_ars, promo_code, source, raw_payload, o.created_at, internal_notes,
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
      internalNotes: row.internal_notes || null,
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
    // Validar transición según state machine
    const currentResult = await query("SELECT status FROM orders WHERE id = $1", [orderId]);
    if (!currentResult.rows[0]) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const currentStatus = currentResult.rows[0].status;
    const validNext = VALID_TRANSITIONS[currentStatus] || [];

    if (!validNext.includes(normalizedStatus)) {
      const fromLabel = ORDER_STATUS_LABELS[currentStatus] || currentStatus;
      const toLabel = ORDER_STATUS_LABELS[normalizedStatus] || normalizedStatus;
      return res.status(400).json({
        error: `No se puede cambiar de "${fromLabel}" a "${toLabel}". Transición no permitida.`
      });
    }

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

// Cancelar pedido (con o sin reembolso en MP)
ordersRouter.post("/:id/cancel", requireAuth, requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);
  const doRefund = req.body?.refund === true;

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "ID de pedido inválido" });
  }

  try {
    const orderResult = await query(
      "SELECT status, payment_method, raw_payload FROM orders WHERE id = $1",
      [orderId]
    );
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    if (order.status === "cancelado") {
      return res.status(400).json({ error: "El pedido ya está cancelado" });
    }
    if (order.status === "entregado") {
      return res.status(400).json({ error: "No se puede cancelar un pedido ya entregado" });
    }

    let refundResult = null;

    if (doRefund) {
      const paymentId = order.raw_payload?.id;
      if (!paymentId) {
        return res.status(400).json({ error: "No hay pago registrado para reembolsar en este pedido" });
      }

      try {
        refundResult = await refundPayment(paymentId);
      } catch (err) {
        return res.status(502).json({ error: `Error al reembolsar en Mercado Pago: ${err.message}` });
      }

      await query("UPDATE orders SET payment_status = 'refunded' WHERE id = $1", [orderId]);
    }

    await handleOrderStatusChange(orderId, "cancelado", { isManualCancel: true });

    return res.json({
      success: true,
      refunded: doRefund,
      refundId: refundResult?.refundId || null
    });
  } catch (err) {
    console.error(`Error cancelando pedido #${orderId}:`, err.message);
    return res.status(500).json({ error: "No se pudo cancelar el pedido" });
  }
});

// Reembolsar sin cancelar
ordersRouter.post("/:id/refund", requireAuth, requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "ID de pedido inválido" });
  }

  try {
    const orderResult = await query(
      "SELECT status, raw_payload FROM orders WHERE id = $1",
      [orderId]
    );
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const paymentId = order.raw_payload?.id;
    if (!paymentId) {
      return res.status(400).json({ error: "No hay pago registrado para reembolsar en este pedido" });
    }

    const refundResult = await refundPayment(paymentId);
    await query("UPDATE orders SET payment_status = 'refunded' WHERE id = $1", [orderId]);

    return res.json({
      success: true,
      refundId: refundResult.refundId
    });
  } catch (err) {
    console.error(`Error reembolsando pedido #${orderId}:`, err.message);
    return res.status(502).json({ error: err.message || "No se pudo procesar el reembolso" });
  }
});

// Exportar pedidos a CSV
ordersRouter.get("/export/csv", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const ordersResult = await query(
      `SELECT o.id, o.wix_order_number, o.customer_name, o.contact_email,
              o.customer_phone, o.customer_address, o.total_ars, o.status,
              o.shipping_method, o.shipping_zone, o.shipping_city,
              o.payment_method, o.payment_status, o.tracking_number,
              o.discount_ars, o.shipping_cost_ars, o.surcharge_ars,
              o.internal_notes, o.created_at
       FROM orders o
       ORDER BY o.created_at DESC`
    );

    const itemsResult = await query(
      `SELECT order_id, product_name, quantity, unit_price_ars, wix_variant
       FROM order_items ORDER BY order_id ASC, id ASC`
    );

    const itemsByOrderId = itemsResult.rows.reduce((acc, row) => {
      if (!acc[row.order_id]) acc[row.order_id] = [];
      acc[row.order_id].push(`${row.product_name}${row.wix_variant ? ` (${row.wix_variant})` : ""} x${row.quantity} @ $${row.unit_price_ars}`);
      return acc;
    }, {});

    const escape = (v) => {
      const s = String(v == null ? "" : v).replace(/"/g, '""');
      return /[,"\n\r]/.test(s) ? `"${s}"` : s;
    };

    const headers = [
      "ID", "Nro. pedido", "Fecha", "Cliente", "Email", "Teléfono", "Dirección",
      "Estado", "Pago", "Estado pago", "Envío método", "Zona", "Ciudad",
      "Subtotal", "Descuento", "Costo envío", "Cargo adicional", "Total",
      "Tracking", "Notas internas", "Ítems"
    ];

    const rows = ordersResult.rows.map((o) => {
      const itemsStr = (itemsByOrderId[o.id] || []).join(" | ");
      const subtotal = Number(o.total_ars) - Number(o.shipping_cost_ars || 0)
        + Number(o.discount_ars || 0) - Number(o.surcharge_ars || 0);

      return [
        o.id,
        o.wix_order_number || "",
        new Date(o.created_at).toLocaleDateString("es-AR"),
        o.customer_name || "",
        o.contact_email || "",
        o.customer_phone || "",
        o.customer_address || "",
        o.status || "",
        o.payment_method || "",
        o.payment_status || "",
        o.shipping_method || "",
        o.shipping_zone || "",
        o.shipping_city || "",
        subtotal.toFixed(2),
        Number(o.discount_ars || 0).toFixed(2),
        Number(o.shipping_cost_ars || 0).toFixed(2),
        Number(o.surcharge_ars || 0).toFixed(2),
        Number(o.total_ars).toFixed(2),
        o.tracking_number || "",
        o.internal_notes || "",
        itemsStr
      ].map(escape).join(",");
    });

    const csv = "\uFEFF" + [headers.map(escape).join(","), ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="pedidos-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error("Error exportando CSV:", err.message);
    return res.status(500).json({ error: "No se pudo exportar" });
  }
});

// Guardar/actualizar notas internas de un pedido
ordersRouter.patch("/:id/notes", requireAuth, requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "ID de pedido inválido" });
  }

  const notes = typeof req.body?.notes === "string" ? req.body.notes : "";

  try {
    const result = await query(
      "UPDATE orders SET internal_notes = $1 WHERE id = $2 RETURNING id",
      [notes.trim() || null, orderId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Pedido no encontrado" });
    return res.json({ success: true });
  } catch (err) {
    console.error(`Error guardando notas para pedido #${orderId}:`, err.message);
    return res.status(500).json({ error: "No se pudieron guardar las notas" });
  }
});

// Editar pedido (ítems, contacto, entrega, ajuste de precio)
ordersRouter.patch("/:id/edit", requireAuth, requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "ID de pedido inválido" });
  }

  const {
    customerName,
    contactEmail,
    customerPhone,
    customerAddress,
    shippingMethod,
    shippingZone,
    shippingCost,
    discount,
    surcharge,
    items
  } = req.body || {};

  // Validar ítems
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "El pedido debe tener al menos un ítem" });
  }

  for (const item of items) {
    if (!item.productName || String(item.productName).trim() === "") {
      return res.status(400).json({ error: "Cada ítem debe tener nombre de producto" });
    }
    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 1) {
      return res.status(400).json({ error: "La cantidad de cada ítem debe ser >= 1" });
    }
    if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
      return res.status(400).json({ error: "El precio unitario de cada ítem debe ser >= 0" });
    }
  }

  const parsedShippingCost = Math.max(0, Number(shippingCost) || 0);
  const parsedDiscount     = Math.max(0, Number(discount) || 0);
  const parsedSurcharge    = Math.max(0, Number(surcharge) || 0);

  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
  const newTotal = subtotal - parsedDiscount + parsedShippingCost + parsedSurcharge;

  if (newTotal < 0) {
    return res.status(400).json({ error: "El total del pedido no puede ser negativo" });
  }

  try {
    const currentResult = await query("SELECT status FROM orders WHERE id = $1", [orderId]);
    if (!currentResult.rows[0]) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const currentStatus = currentResult.rows[0].status;
    if (currentStatus === "cancelado" || currentStatus === "entregado") {
      return res.status(400).json({ error: `No se puede editar un pedido en estado "${currentStatus}"` });
    }

    // Actualizar campos del pedido
    await query(
      `UPDATE orders SET
        customer_name       = COALESCE($2, customer_name),
        contact_email       = COALESCE($3, contact_email),
        customer_phone      = COALESCE($4, customer_phone),
        customer_address    = COALESCE($5, customer_address),
        shipping_method     = COALESCE($6, shipping_method),
        shipping_zone       = COALESCE($7, shipping_zone),
        shipping_cost_ars   = $8,
        discount_ars        = $9,
        surcharge_ars       = $10,
        total_ars           = $11,
        order_items_count   = $12
       WHERE id = $1`,
      [
        orderId,
        customerName   ? String(customerName).trim()   : null,
        contactEmail   ? String(contactEmail).trim()   : null,
        customerPhone  ? String(customerPhone).trim()  : null,
        customerAddress? String(customerAddress).trim(): null,
        shippingMethod ? String(shippingMethod).trim() : null,
        shippingZone   ? String(shippingZone).trim()   : null,
        parsedShippingCost,
        parsedDiscount,
        parsedSurcharge,
        newTotal,
        items.length
      ]
    );

    // Reemplazar ítems
    await query("DELETE FROM order_items WHERE order_id = $1", [orderId]);

    for (const item of items) {
      await query(
        `INSERT INTO order_items
          (order_id, product_id, variant_id, product_name, quantity, unit_price_ars, wix_variant, wix_sku)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          orderId,
          item.productId   ? Number(item.productId)   : null,
          item.variantId   ? Number(item.variantId)   : null,
          String(item.productName).trim(),
          Number(item.quantity),
          Number(item.unitPrice),
          item.variant ? String(item.variant).trim() : null,
          item.sku     ? String(item.sku).trim()     : null
        ]
      );
    }

    // Actualizar factura: si existía, borrar y emitir una nueva
    const invoiceCheck = await query("SELECT id FROM order_invoices WHERE order_id = $1", [orderId]);
    let newInvoiceNumber = null;
    if (invoiceCheck.rows.length > 0) {
      await query("DELETE FROM order_invoices WHERE order_id = $1", [orderId]);
      const invoiceResult = await query(
        `INSERT INTO order_invoices (order_id, invoice_number)
         VALUES ($1, nextval('order_invoice_number_seq'))
         RETURNING invoice_number`,
        [orderId]
      );
      newInvoiceNumber = Number(invoiceResult.rows[0].invoice_number);
    }

    return res.json({
      success: true,
      total: newTotal,
      invoiceNumber: newInvoiceNumber
    });
  } catch (err) {
    console.error(`Error editando pedido #${orderId}:`, err.message);
    return res.status(500).json({ error: "No se pudo guardar el pedido" });
  }
});

// Archivar pedido
ordersRouter.patch("/:id/archive", requireAuth, requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "ID de pedido inválido" });
  }

  try {
    const result = await query(
      "UPDATE orders SET archived_at = NOW() WHERE id = $1 RETURNING id",
      [orderId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error(`Error archivando pedido #${orderId}:`, err.message);
    return res.status(500).json({ error: "No se pudo archivar el pedido" });
  }
});

export default ordersRouter;
