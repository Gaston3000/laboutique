/**
 * Rutas de pagos — Mercado Pago webhooks y verificación
 * 
 * Maneja:
 * - POST /mercadopago/webhook — Notificaciones automáticas de MP
 * - POST /verify-payment/:orderId — Verificación manual (admin)
 * - POST /sync-payment/:orderId — Sincronización manual (admin)
 */
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { handleOrderStatusChange } from "../services/notificationService.js";
import {
  validateWebhookSignature,
  getPayment,
  searchPayments
} from "../services/mercadopago.js";

const paymentsRouter = Router();

// ── Helpers de BD para webhooks ─────────────────────────────────────────────

async function checkWebhookIdempotency(paymentId, mpStatus) {
  try {
    const result = await query(
      `SELECT 1 FROM webhook_processed WHERE payment_id = $1 AND mp_status = $2 LIMIT 1`,
      [paymentId, mpStatus]
    );
    return result.rows.length > 0;
  } catch {
    // Si la tabla no existe todavía, no bloquear
    return false;
  }
}

async function markWebhookProcessed(paymentId, mpStatus, orderId) {
  try {
    await query(
      `INSERT INTO webhook_processed (payment_id, mp_status, order_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (payment_id, mp_status) DO NOTHING`,
      [paymentId, mpStatus, orderId]
    );
  } catch (err) {
    console.warn(`[Payments] ⚠️ No se pudo registrar idempotencia webhook: ${err.message}`);
  }
}

async function safeLogWebhook(entry) {
  try {
    await query(
      `INSERT INTO webhook_logs (event_type, event_action, data_id, order_id, mp_status, signature_ok, processed, skipped, error_message, raw_body)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        entry.event_type || "unknown",
        entry.event_action || null,
        entry.data_id || 0,
        entry.order_id || null,
        entry.mp_status || null,
        entry.signature_ok ?? false,
        entry.processed ?? false,
        entry.skipped ?? false,
        entry.error_message || null,
        entry.raw_body ? JSON.stringify(entry.raw_body) : null
      ]
    );
  } catch (err) {
    console.warn(`[Payments] ⚠️ No se pudo loguear webhook: ${err.message}`);
  }
}

// ── Webhook de Mercado Pago ─────────────────────────────────────────────────

paymentsRouter.post("/mercadopago/webhook", async (req, res) => {
  const signatureOk = validateWebhookSignature(req);
  const type = String(req.body?.type || req.query?.type || "").trim().toLowerCase();
  const action = String(req.body?.action || "").trim().toLowerCase();
  const dataId = Number(req.body?.data?.id || req.query?.["data.id"] || req.query?.id);

  // Log de auditoría
  const logEntry = {
    event_type: type,
    event_action: action,
    data_id: Number.isInteger(dataId) && dataId > 0 ? dataId : 0,
    signature_ok: signatureOk,
    raw_body: req.body || null
  };

  // Rechazar webhooks sin firma válida
  if (!signatureOk) {
    console.warn("[Payments] 🚫 Webhook MercadoPago con firma inválida RECHAZADO");
    logEntry.error_message = "Invalid signature";
    await safeLogWebhook(logEntry);
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Ignorar eventos que no son de pago
  if (type !== "payment" && !action.includes("payment")) {
    logEntry.skipped = true;
    await safeLogWebhook(logEntry);
    return res.status(200).json({ ok: true, ignored: true });
  }

  if (!Number.isInteger(dataId) || dataId <= 0) {
    logEntry.skipped = true;
    logEntry.error_message = "Invalid data.id";
    await safeLogWebhook(logEntry);
    return res.status(200).json({ ok: true, ignored: true });
  }

  try {
    // Verificación activa: consultamos el estado real del pago en MP
    const payment = await getPayment(dataId);
    const externalReference = Number(payment.external_reference);

    if (!Number.isInteger(externalReference) || externalReference <= 0) {
      logEntry.skipped = true;
      logEntry.error_message = "Invalid external_reference";
      await safeLogWebhook(logEntry);
      return res.status(200).json({ ok: true, ignored: true });
    }

    const mpStatus = String(payment.status || "").trim().toLowerCase();
    logEntry.order_id = externalReference;
    logEntry.mp_status = mpStatus;

    // Idempotencia: no procesar el mismo payment+status dos veces
    const alreadyProcessed = await checkWebhookIdempotency(dataId, mpStatus);
    if (alreadyProcessed) {
      console.log(`[Payments] ℹ️ Webhook duplicado ignorado: payment ${dataId} status ${mpStatus}`);
      logEntry.skipped = true;
      logEntry.error_message = "Duplicate — already processed";
      logEntry.processed = false;
      await safeLogWebhook(logEntry);
      return res.status(200).json({ ok: true, duplicate: true });
    }

    // Verificar que el monto pagado coincide con el total del pedido
    const orderCheck = await query(
      `SELECT total_ars, payment_status FROM orders WHERE id = $1`,
      [externalReference]
    );

    if (orderCheck.rows.length > 0 && mpStatus === "approved") {
      const orderTotal = Number(orderCheck.rows[0].total_ars);
      const paidAmount = Number(payment.transaction_amount || 0);

      if (Math.abs(orderTotal - paidAmount) > 1) {
        console.error(`[Payments] 🚫 MONTO NO COINCIDE pedido #${externalReference}: esperado $${orderTotal}, recibido $${paidAmount}`);
        logEntry.error_message = `Amount mismatch: order $${orderTotal} vs payment $${paidAmount}`;
        logEntry.processed = false;
        await safeLogWebhook(logEntry);
        return res.status(200).json({ ok: true, ignored: true, reason: "amount_mismatch" });
      }
    }

    const mappedOrderStatus = mpStatus === "approved" ? "pago" : "nuevo";

    // Actualizar el pedido en la DB
    await query(
      `UPDATE orders
       SET status = CASE
          WHEN $1 = 'approved' THEN 'pago'
          WHEN $1 IN ('cancelled', 'rejected', 'refunded', 'charged_back') THEN 'cancelado'
          ELSE status
        END,
        payment_status = $1,
        payment_method = COALESCE(NULLIF($2, ''), payment_method, 'mercadopago'),
        source = COALESCE(source, 'web-mp'),
        raw_payload = COALESCE(raw_payload, '{}'::jsonb) || $3::jsonb
       WHERE id = $4`,
      [
        mpStatus,
        String(payment.payment_method_id || "").trim(),
        JSON.stringify({
          mercadopago_payment: {
            id: payment.id,
            status: mpStatus,
            status_detail: payment.status_detail || null,
            approved_at: payment.date_approved || null,
            updated_at: new Date().toISOString(),
            transaction_amount: payment.transaction_amount || null,
            external_reference: payment.external_reference || null
          }
        }),
        externalReference
      ]
    );

    // Marcar como procesado para idempotencia
    await markWebhookProcessed(dataId, mpStatus, externalReference);

    // Disparar notificaciones (no bloqueante)
    if (mpStatus === "approved") {
      handleOrderStatusChange(externalReference, "pago", { skipDbUpdate: true }).catch((err) => {
        console.error(`[Payments] ⚠️ Error notificación PAYMENT_APPROVED pedido #${externalReference}:`, err.message);
      });
    } else if (["cancelled", "rejected", "refunded", "charged_back"].includes(mpStatus)) {
      handleOrderStatusChange(externalReference, "cancelado", { skipDbUpdate: true }).catch((err) => {
        console.error(`[Payments] ⚠️ Error notificación PAYMENT_FAILED pedido #${externalReference}:`, err.message);
      });
    }

    logEntry.processed = true;
    await safeLogWebhook(logEntry);

    return res.status(200).json({ ok: true, orderStatus: mappedOrderStatus });
  } catch (err) {
    console.error(`[Payments] ⚠️ Error procesando webhook (payment ${dataId}):`, err.message);
    logEntry.error_message = err.message;
    await safeLogWebhook(logEntry);
    // Responder 200 para que MP no reintente indefinidamente
    return res.status(200).json({ ok: true, ignored: true });
  }
});

// ── Verificación manual de pago (admin) ─────────────────────────────────────

paymentsRouter.post("/verify-payment/:orderId", requireAuth, requireAdmin, async (req, res) => {
  const orderId = Number(req.params.orderId);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "ID de pedido inválido" });
  }

  try {
    const orderResult = await query(
      `SELECT id, total_ars, payment_status, raw_payload FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const order = orderResult.rows[0];
    const rawPayload = order.raw_payload || {};
    const mpPaymentId = rawPayload?.mercadopago_payment?.id;

    let payment;

    if (mpPaymentId) {
      // Consultar el pago conocido directamente
      payment = await getPayment(mpPaymentId);
    } else {
      // Buscar por external_reference
      const results = await searchPayments(orderId);

      if (!results.length) {
        return res.json({
          orderId,
          verified: false,
          message: "No se encontraron pagos en Mercado Pago para este pedido",
          currentPaymentStatus: order.payment_status
        });
      }

      payment = results[0]; // El más reciente
    }

    return res.json({
      orderId,
      verified: true,
      mpPaymentId: payment.id,
      mpStatus: payment.status,
      mpStatusDetail: payment.status_detail,
      mpAmount: payment.transaction_amount,
      orderTotal: Number(order.total_ars),
      amountMatch: Math.abs(Number(order.total_ars) - Number(payment.transaction_amount)) <= 1,
      currentPaymentStatus: order.payment_status,
      mpDateApproved: payment.date_approved,
      mpDateCreated: payment.date_created
    });
  } catch (err) {
    console.error(`[Payments] ⚠️ Error verificando pago pedido #${orderId}:`, err.message);
    return res.status(500).json({ error: "Error al verificar pago con Mercado Pago" });
  }
});

// ── Sincronización manual de pago (admin) ───────────────────────────────────

paymentsRouter.post("/sync-payment/:orderId", requireAuth, requireAdmin, async (req, res) => {
  const orderId = Number(req.params.orderId);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "ID de pedido inválido" });
  }

  try {
    const orderResult = await query(
      `SELECT id, total_ars, payment_status, raw_payload FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const order = orderResult.rows[0];
    const rawPayload = order.raw_payload || {};
    const mpPaymentId = rawPayload?.mercadopago_payment?.id;

    let payment;

    if (mpPaymentId) {
      payment = await getPayment(mpPaymentId);
    } else {
      const results = await searchPayments(orderId);

      if (!results.length) {
        return res.status(404).json({ error: "No se encontraron pagos en Mercado Pago" });
      }

      payment = results[0];
    }

    const mpStatus = payment.status;

    if (mpStatus !== "approved") {
      return res.status(400).json({ error: `El pago en MP no está aprobado (estado: ${mpStatus})` });
    }

    const paidAmount = Number(payment.transaction_amount || 0);
    const orderTotal = Number(order.total_ars);

    if (Math.abs(orderTotal - paidAmount) > 1) {
      return res.status(400).json({ error: `Monto no coincide: pedido $${orderTotal} vs pago $${paidAmount}` });
    }

    await query(
      `UPDATE orders
       SET status = 'pago',
           payment_status = 'approved',
           payment_method = COALESCE(NULLIF($1, ''), payment_method, 'mercadopago'),
           source = COALESCE(source, 'web-mp'),
           raw_payload = COALESCE(raw_payload, '{}'::jsonb) || $2::jsonb
       WHERE id = $3`,
      [
        String(payment.payment_method_id || "").trim(),
        JSON.stringify({
          mercadopago_payment: {
            id: payment.id,
            status: mpStatus,
            status_detail: payment.status_detail || null,
            approved_at: payment.date_approved || null,
            updated_at: new Date().toISOString(),
            transaction_amount: payment.transaction_amount || null,
            external_reference: payment.external_reference || null,
            synced_manually: true
          }
        }),
        orderId
      ]
    );

    // Notificación (no bloqueante)
    handleOrderStatusChange(orderId, "pago", { skipDbUpdate: true }).catch((err) => {
      console.error(`[Payments] ⚠️ Error notificación sync-payment pedido #${orderId}:`, err.message);
    });

    return res.json({ ok: true, orderId, newStatus: "pago", newPaymentStatus: "approved" });
  } catch (err) {
    console.error(`[Payments] ⚠️ Error sincronizando pago pedido #${orderId}:`, err.message);
    return res.status(500).json({ error: "Error al sincronizar pago con Mercado Pago" });
  }
});

export default paymentsRouter;
