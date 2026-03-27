/**
 * Servicio de Mercado Pago — Checkout Pro
 * 
 * Centraliza toda la comunicación con la API de Mercado Pago.
 * Usa el SDK oficial `mercadopago` para crear preferencias,
 * consultar pagos y validar webhooks.
 */
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import crypto from "crypto";

// ── Inicialización lazy del SDK ──────────────────────────────────────────────
// Se inicializa en la primera llamada, no al importar el módulo.
// Esto garantiza que dotenv ya haya cargado las variables de entorno.
let mpClient = null;
let preferenceClient = null;
let paymentClient = null;
let initialized = false;

function initializeSDK() {
  if (initialized) return;
  initialized = true;

  const accessToken = String(process.env.MERCADOPAGO_ACCESS_TOKEN || "").trim();

  if (accessToken) {
    mpClient = new MercadoPagoConfig({ accessToken });
    preferenceClient = new Preference(mpClient);
    paymentClient = new Payment(mpClient);
    console.log("[MercadoPago] SDK inicializado correctamente");
  } else {
    console.warn("[MercadoPago] ⚠️ MERCADOPAGO_ACCESS_TOKEN no configurado — los pagos no van a funcionar");
  }
}

// ── Helpers internos ────────────────────────────────────────────────────────

function toMoneyAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

/**
 * Verifica que el SDK esté configurado. Lanza error si no.
 */
function ensureConfigured() {
  initializeSDK();

  if (!mpClient || !preferenceClient || !paymentClient) {
    throw new Error(
      "Mercado Pago no está configurado. Agregá MERCADOPAGO_ACCESS_TOKEN en el archivo .env y reiniciá el servidor."
    );
  }
}

// ── Funciones públicas ──────────────────────────────────────────────────────

/**
 * Construye el array de items de MP a partir de las líneas de orden.
 * Aplica el descuento proporcionalmente entre los ítems.
 */
export function buildMercadoPagoItems({ orderId, orderLines, shippingCost, discount }) {
  let discountRemaining = toMoneyAmount(discount);

  const items = orderLines
    .map((line) => {
      const lineTotal = toMoneyAmount(line.unitPrice * line.quantity);
      const lineDiscount = Math.min(discountRemaining, lineTotal);
      discountRemaining = toMoneyAmount(discountRemaining - lineDiscount);
      const netLineTotal = toMoneyAmount(lineTotal - lineDiscount);

      if (netLineTotal <= 0) {
        return null;
      }

      return {
        id: String(line.variantId ? `${line.productId}-${line.variantId}` : line.productId),
        title: `${line.productName} x${line.quantity}`,
        quantity: 1,
        currency_id: "ARS",
        unit_price: netLineTotal
      };
    })
    .filter(Boolean);

  if (toMoneyAmount(shippingCost) > 0) {
    items.push({
      id: `shipping-${orderId}`,
      title: "Envío",
      quantity: 1,
      currency_id: "ARS",
      unit_price: toMoneyAmount(shippingCost)
    });
  }

  if (!items.length) {
    throw new Error("No hay ítems válidos para generar el pago");
  }

  return items;
}

/**
 * Crea una preferencia de pago en Mercado Pago (Checkout Pro).
 * 
 * @param {Object} options
 * @param {number} options.orderId - ID del pedido en nuestra DB
 * @param {string} options.customerName - Nombre del comprador
 * @param {Array}  options.orderLines - Líneas del pedido
 * @param {number} options.shippingCost - Costo de envío
 * @param {number} options.discount - Descuento total aplicado
 * @param {number} options.total - Total a cobrar
 * @param {string} options.clientUrl - URL base del frontend (para back_urls)
 * @param {string} options.notificationUrl - URL pública del webhook
 * @returns {Promise<{preferenceId: string, checkoutUrl: string, sandboxCheckoutUrl: string|null}>}
 */
export async function createPreference({
  orderId,
  customerName,
  orderLines,
  shippingCost,
  discount,
  total,
  clientUrl,
  notificationUrl
}) {
  ensureConfigured();

  const items = buildMercadoPagoItems({ orderId, orderLines, shippingCost, discount });

  // URLs de retorno al frontend después del pago
  const backUrls = clientUrl
    ? {
        success: `${clientUrl}/?checkout=success&order=${orderId}`,
        failure: `${clientUrl}/?checkout=failure&order=${orderId}`,
        pending: `${clientUrl}/?checkout=pending&order=${orderId}`
      }
    : undefined;

  // Solo auto_return si el frontend NO es localhost
  const isLocalClientUrl = (() => {
    if (!clientUrl) return true;
    try {
      const hostname = new URL(clientUrl).hostname.toLowerCase();
      return hostname === "localhost" || hostname === "127.0.0.1";
    } catch {
      return true;
    }
  })();

  const preferenceData = {
    body: {
      external_reference: String(orderId),
      statement_descriptor: "BOUTTIQUE LIMPIEZA",
      notification_url: notificationUrl,
      ...(backUrls ? { back_urls: backUrls } : {}),
      ...((backUrls && !isLocalClientUrl) ? { auto_return: "approved" } : {}),
      payer: {
        name: customerName
      },
      metadata: {
        order_id: orderId,
        source: "web-store"
      },
      items
    }
  };

  const preference = await preferenceClient.create(preferenceData);

  if (!preference?.init_point) {
    throw new Error("Mercado Pago no devolvió una URL de pago válida");
  }

  // En desarrollo (NODE_ENV != production), usar sandbox_init_point para que
  // las cuentas de prueba funcionen correctamente en el checkout.
  const useSandbox = process.env.NODE_ENV !== "production" && preference.sandbox_init_point;
  const primaryCheckoutUrl = useSandbox ? preference.sandbox_init_point : preference.init_point;

  if (useSandbox) {
    console.log("[MercadoPago] Usando sandbox URL para checkout (modo desarrollo)");
  }

  return {
    preferenceId: preference.id,
    checkoutUrl: primaryCheckoutUrl,
    sandboxCheckoutUrl: preference.sandbox_init_point || null,
    total,
    discount,
    createdAt: new Date().toISOString()
  };
}

/**
 * Consulta un pago específico en Mercado Pago por su ID.
 */
export async function getPayment(paymentId) {
  ensureConfigured();

  const payment = await paymentClient.get({ id: paymentId });

  if (!payment || !payment.id) {
    throw new Error(`No se encontró el pago #${paymentId} en Mercado Pago`);
  }

  return payment;
}

/**
 * Busca pagos en Mercado Pago por external_reference (nuestro orderId).
 */
export async function searchPayments(orderId) {
  ensureConfigured();

  const accessToken = String(process.env.MERCADOPAGO_ACCESS_TOKEN || "").trim();

  // El SDK no tiene search directo, usamos fetch
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}&sort=date_created&criteria=desc&limit=5`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Error buscando pagos en Mercado Pago");
  }

  return data.results || [];
}

/**
 * Valida la firma HMAC-SHA256 del webhook de Mercado Pago.
 * 
 * SEGURIDAD: Rechaza TODOS los webhooks si el secret no está configurado.
 * Usa timing-safe comparison para prevenir timing attacks.
 * 
 * @param {import('express').Request} req - Request de Express
 * @returns {boolean} true si la firma es válida
 */
export function validateWebhookSignature(req) {
  const mpWebhookSecret = String(process.env.MERCADOPAGO_WEBHOOK_SECRET || "").trim();

  if (!mpWebhookSecret) {
    console.error("[MercadoPago] 🚫 MERCADOPAGO_WEBHOOK_SECRET no configurado — webhook RECHAZADO");
    return false;
  }

  const xSignature = req.headers["x-signature"];
  const xRequestId = req.headers["x-request-id"];

  if (!xSignature || !xRequestId) {
    return false;
  }

  // Parsear x-signature: "ts=...,v1=..."
  const parts = {};
  for (const part of xSignature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key && value) parts[key.trim()] = value.trim();
  }

  const ts = parts.ts;
  const v1 = parts.v1;

  if (!ts || !v1) {
    return false;
  }

  const dataId = String(req.query?.["data.id"] || req.body?.data?.id || "");
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto.createHmac("sha256", mpWebhookSecret).update(manifest).digest("hex");

  // Comparación segura contra timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
  } catch {
    return false;
  }
}

/**
 * Verifica si el SDK de Mercado Pago está configurado.
 */
export function isConfigured() {
  initializeSDK();
  return Boolean(mpClient && preferenceClient && paymentClient);
}
