/**
 * Dynamic email templates for order lifecycle events.
 *
 * Each builder receives an order details object and returns { subject, html }.
 */

const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

const BRAND = "La Boutique de la Limpieza";
const BRAND_COLOR = "#1a4ac8";

// ── Shared helpers ──────────────────────────────────────────

function fmtDate(date) {
  return new Date(date || Date.now()).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(value) {
  const n = Number(value || 0);
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Reusable layout wrappers ────────────────────────────────

function headerBlock(icon, title, subtitle, bgGradient = `linear-gradient(135deg, ${BRAND_COLOR} 0%, #2563eb 100%)`) {
  return `
  <tr>
    <td style="background:${bgGradient};padding:40px 30px;text-align:center;">
      <div style="font-size:48px;margin-bottom:10px;">${icon}</div>
      <h1 style="margin:0;color:#fff;font-size:26px;font-weight:bold;">${escapeHtml(title)}</h1>
      ${subtitle ? `<p style="margin:10px 0 0 0;color:#e0e7ff;font-size:15px;">${escapeHtml(subtitle)}</p>` : ""}
    </td>
  </tr>`;
}

function footerBlock() {
  return `
  <tr>
    <td style="background-color:#f9fafb;padding:30px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 10px 0;font-size:16px;color:#1f2937;font-weight:600;">${escapeHtml(BRAND)}</p>
      <p style="margin:0;font-size:14px;color:#6b7280;">Tu tienda de productos de limpieza de confianza</p>
      <p style="margin:20px 0 0 0;font-size:12px;color:#9ca3af;">Este es un email automático, por favor no respondas a este mensaje.</p>
    </td>
  </tr>`;
}

function wrapLayout(body) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 0;">
      <table role="presentation" style="width:600px;max-width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
        ${body}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(label, url) {
  return `
  <div style="text-align:center;margin:30px 0;">
    <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${BRAND_COLOR} 0%,#2563eb 100%);color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">${escapeHtml(label)}</a>
  </div>`;
}

function itemsTable(items) {
  if (!items || !items.length) return "";
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;"><strong style="color:#1f2937;">${escapeHtml(i.product_name)}</strong></td>
        <td style="padding:12px 0;text-align:center;color:#6b7280;border-bottom:1px solid #f3f4f6;">x${i.quantity}</td>
        <td style="padding:12px 0;text-align:right;color:#1f2937;font-weight:500;border-bottom:1px solid #f3f4f6;">${fmtMoney(i.unit_price_ars * i.quantity)}</td>
      </tr>`
    )
    .join("");
  return `<h2 style="margin:30px 0 15px 0;font-size:18px;border-bottom:2px solid #e5e7eb;padding-bottom:10px;">📦 Productos</h2>
    <table style="width:100%;margin-bottom:20px;">${rows}</table>`;
}

function orderSummaryBlock(d) {
  const subtotal = d.subtotalArs ?? d.totalArs ?? 0;
  const lines = [];
  lines.push(`<tr><td style="padding:12px 20px;">Subtotal</td><td style="padding:12px 20px;text-align:right;">${fmtMoney(subtotal)}</td></tr>`);
  if (d.discountArs > 0) {
    lines.push(`<tr><td style="padding:12px 20px;color:#059669;">Descuento${d.promoCode ? ` (${escapeHtml(d.promoCode)})` : ""}</td><td style="padding:12px 20px;text-align:right;color:#059669;font-weight:600;">-${fmtMoney(d.discountArs)}</td></tr>`);
  }
  const shippingLabel = d.shippingCostArs === 0 ? "GRATIS" : fmtMoney(d.shippingCostArs);
  const shippingStyle = d.shippingCostArs === 0 ? "color:#059669;font-weight:600;" : "";
  lines.push(`<tr><td style="padding:12px 20px;">Envío${d.shippingZone ? ` (${escapeHtml(d.shippingZone)})` : ""}</td><td style="padding:12px 20px;text-align:right;${shippingStyle}">${shippingLabel}</td></tr>`);
  lines.push(`<tr style="border-top:2px solid #e5e7eb;"><td style="padding:16px 20px;font-size:18px;font-weight:bold;">TOTAL</td><td style="padding:16px 20px;text-align:right;color:#059669;font-size:22px;font-weight:bold;">${fmtMoney(d.totalArs)} ARS</td></tr>`);
  return `<table style="width:100%;margin:30px 0;background-color:#f9fafb;border-radius:8px;">${lines.join("")}</table>`;
}

// ── Template builders ───────────────────────────────────────

/** ORDER_CREATED — "Pedido recibido - en revisión" (to user) */
export function orderCreated(d) {
  const body = `
    ${headerBlock("🛒", "¡Recibimos tu pedido!", `Pedido #${d.orderId}`)}
    <tr><td style="padding:40px 30px;">
      <p style="font-size:16px;color:#333;">Hola <strong>${escapeHtml(d.customerName)}</strong>,</p>
      <p style="color:#666;line-height:1.6;">Tu pedido <strong>#${d.orderId}</strong> fue recibido y está en revisión. Te notificaremos cuando confirmemos tu pago.</p>
      ${itemsTable(d.items)}
      ${orderSummaryBlock(d)}
      ${d.deliveryAddress ? `<h2 style="margin:30px 0 15px 0;font-size:18px;border-bottom:2px solid #e5e7eb;">📍 Dirección de Entrega</h2><p style="padding:15px;background:#f9fafb;border-radius:6px;color:#374151;line-height:1.6;">${escapeHtml(d.deliveryAddress)}</p>` : ""}
      ${ctaButton("Ver mi pedido", `${CLIENT_URL}/?checkout=success&order=${d.orderId}`)}
    </td></tr>
    ${footerBlock()}`;
  return {
    subject: `🛒 Pedido #${d.orderId} recibido - La Boutique de la Limpieza`,
    html: wrapLayout(body),
  };
}

/** PAYMENT_APPROVED — "Pago confirmado" (to user) */
export function paymentApproved(d) {
  const body = `
    ${headerBlock("✅", "¡Pago Confirmado!", `Pedido #${d.orderId}`, "linear-gradient(135deg, #059669 0%, #10b981 100%)")}
    <tr><td style="padding:40px 30px;">
      <p style="font-size:16px;color:#333;">Hola <strong>${escapeHtml(d.customerName)}</strong>,</p>
      <p style="color:#666;line-height:1.6;">Tu pago por el pedido <strong>#${d.orderId}</strong> fue aprobado exitosamente. Estamos procesando tu pedido.</p>
      ${itemsTable(d.items)}
      ${orderSummaryBlock(d)}
      ${ctaButton("Ver mi pedido", `${CLIENT_URL}/?checkout=success&order=${d.orderId}`)}
    </td></tr>
    ${footerBlock()}`;
  return {
    subject: `✅ Pago confirmado - Pedido #${d.orderId} - La Boutique`,
    html: wrapLayout(body),
  };
}

/** ORDER_CONFIRMED — "Pedido confirmado" (to user) */
export function orderConfirmed(d) {
  const body = `
    ${headerBlock("📋", "Pedido Confirmado", `Pedido #${d.orderId}`, "linear-gradient(135deg, #1a4ac8 0%, #2563eb 100%)")}
    <tr><td style="padding:40px 30px;">
      <p style="font-size:16px;color:#333;">Hola <strong>${escapeHtml(d.customerName)}</strong>,</p>
      <p style="color:#666;line-height:1.6;">Tu pedido <strong>#${d.orderId}</strong> fue confirmado. Pronto comenzaremos a prepararlo.</p>
      ${itemsTable(d.items)}
      ${orderSummaryBlock(d)}
      ${ctaButton("Ver mi pedido", `${CLIENT_URL}/?checkout=success&order=${d.orderId}`)}
    </td></tr>
    ${footerBlock()}`;
  return {
    subject: `📋 Pedido #${d.orderId} confirmado - La Boutique`,
    html: wrapLayout(body),
  };
}

/** ORDER_PROCESSING — "Estamos preparando tu pedido" (to user) */
export function orderProcessing(d) {
  const body = `
    ${headerBlock("⚙️", "Estamos Preparando tu Pedido", `Pedido #${d.orderId}`, "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)")}
    <tr><td style="padding:40px 30px;">
      <p style="font-size:16px;color:#333;">Hola <strong>${escapeHtml(d.customerName)}</strong>,</p>
      <p style="color:#666;line-height:1.6;">Tu pedido <strong>#${d.orderId}</strong> está siendo preparado. ¡Ya falta poco!</p>
      ${itemsTable(d.items)}
      ${ctaButton("Ver mi pedido", `${CLIENT_URL}/?checkout=success&order=${d.orderId}`)}
    </td></tr>
    ${footerBlock()}`;
  return {
    subject: `⚙️ Preparando tu pedido #${d.orderId} - La Boutique`,
    html: wrapLayout(body),
  };
}

/** ORDER_READY_FOR_PICKUP — "Tu pedido está listo para retirar" (to user, pickup) */
export function orderReadyForPickup(d) {
  const body = `
    ${headerBlock("🏪", "¡Tu Pedido Está Listo!", `Pedido #${d.orderId}`, "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)")}
    <tr><td style="padding:40px 30px;">
      <p style="font-size:16px;color:#333;">Hola <strong>${escapeHtml(d.customerName)}</strong>,</p>
      <p style="color:#666;line-height:1.6;">Tu pedido <strong>#${d.orderId}</strong> está listo para retirar en nuestra tienda.</p>
      <div style="background:#f5f3ff;border:2px solid #8b5cf6;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#5b21b6;">📍 Dirección de retiro</p>
        <p style="margin:0;color:#374151;font-size:15px;">La Boutique de la Limpieza</p>
        <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">Presentá tu DNI y número de pedido <strong>#${d.orderId}</strong></p>
      </div>
      ${itemsTable(d.items)}
      ${orderSummaryBlock(d)}
    </td></tr>
    ${footerBlock()}`;
  return {
    subject: `🏪 Pedido #${d.orderId} listo para retirar - La Boutique`,
    html: wrapLayout(body),
  };
}

/** ORDER_SHIPPED — "Tu pedido fue enviado" (to user, shipping) */
export function orderShipped(d) {
  const trackingBlock = d.trackingNumber
    ? `<div style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);padding:25px;margin:20px 0;border-radius:8px;">
        <h3 style="color:#1e40af;margin:0 0 12px;">📦 Información de Seguimiento</h3>
        <table style="width:100%;">
          <tr><td style="padding:8px 0;font-weight:600;">Nro. de Seguimiento:</td><td style="text-align:right;color:${BRAND_COLOR};font-family:monospace;font-weight:bold;">${escapeHtml(d.trackingNumber)}</td></tr>
          ${d.carrier ? `<tr><td style="padding:8px 0;font-weight:600;">Empresa:</td><td style="text-align:right;">${escapeHtml(d.carrier)}</td></tr>` : ""}
        </table>
      </div>`
    : "";
  const body = `
    ${headerBlock("🚚", "¡Tu Pedido Está en Camino!", `Pedido #${d.orderId}`, "linear-gradient(135deg, #059669 0%, #10b981 100%)")}
    <tr><td style="padding:40px 30px;">
      <p style="font-size:16px;color:#333;">Hola <strong>${escapeHtml(d.customerName)}</strong>,</p>
      <p style="color:#666;line-height:1.6;">Tu pedido <strong>#${d.orderId}</strong> fue enviado. ¡Ya está en camino!</p>
      ${trackingBlock}
      ${itemsTable(d.items)}
      ${ctaButton("Ver mi pedido", `${CLIENT_URL}/?checkout=success&order=${d.orderId}`)}
    </td></tr>
    ${footerBlock()}`;
  return {
    subject: `🚚 Pedido #${d.orderId} enviado - La Boutique`,
    html: wrapLayout(body),
  };
}

/** ORDER_DELIVERED — "Pedido entregado" (to user) */
export function orderDelivered(d) {
  const body = `
    ${headerBlock("🎉", "¡Pedido Entregado!", `Pedido #${d.orderId}`, "linear-gradient(135deg, #059669 0%, #10b981 100%)")}
    <tr><td style="padding:40px 30px;">
      <p style="font-size:16px;color:#333;">Hola <strong>${escapeHtml(d.customerName)}</strong>,</p>
      <p style="color:#666;line-height:1.6;">Tu pedido <strong>#${d.orderId}</strong> fue entregado. ¡Gracias por tu compra!</p>
      <p style="color:#666;line-height:1.6;">Si tenés alguna consulta sobre tu pedido, no dudes en contactarnos.</p>
      ${ctaButton("Volver a comprar", CLIENT_URL)}
    </td></tr>
    ${footerBlock()}`;
  return {
    subject: `🎉 Pedido #${d.orderId} entregado - La Boutique`,
    html: wrapLayout(body),
  };
}

/** PAYMENT_FAILED — "Pago rechazado" (to user) */
export function paymentFailed(d) {
  const body = `
    ${headerBlock("⚠️", "Pago No Aprobado", `Pedido #${d.orderId}`, "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)")}
    <tr><td style="padding:40px 30px;">
      <p style="font-size:16px;color:#333;">Hola <strong>${escapeHtml(d.customerName)}</strong>,</p>
      <p style="color:#666;line-height:1.6;">Lamentablemente, el pago de tu pedido <strong>#${d.orderId}</strong> no fue aprobado.</p>
      <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:bold;color:#991b1b;">Posibles motivos:</p>
        <ul style="margin:0;padding-left:20px;color:#7f1d1d;font-size:14px;line-height:1.8;">
          <li>Fondos insuficientes</li>
          <li>Tarjeta vencida o datos incorrectos</li>
          <li>Límite de compra excedido</li>
        </ul>
      </div>
      <p style="color:#666;line-height:1.6;">Podés intentar nuevamente o usar otro medio de pago.</p>
      ${ctaButton("Intentar de nuevo", CLIENT_URL)}
    </td></tr>
    ${footerBlock()}`;
  return {
    subject: `⚠️ Pago no aprobado - Pedido #${d.orderId} - La Boutique`,
    html: wrapLayout(body),
  };
}

/** ORDER_CREATED — Admin notification email */
export function adminNewOrder(d) {
  const itemRows = (d.items || [])
    .map(
      (i) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(i.product_name)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">x${i.quantity}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtMoney(i.unit_price_ars * i.quantity)}</td></tr>`
    )
    .join("");

  const body = `
    ${headerBlock("🔔", "Nuevo Pedido Recibido", `Pedido #${d.orderId}`)}
    <tr><td style="padding:40px 30px;">
      <table style="width:100%;margin-bottom:20px;">
        <tr><td style="padding:8px 0;font-weight:600;">Cliente:</td><td>${escapeHtml(d.customerName)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600;">Email:</td><td>${escapeHtml(d.contactEmail)}</td></tr>
        ${d.customerPhone ? `<tr><td style="padding:8px 0;font-weight:600;">Teléfono:</td><td>${escapeHtml(d.customerPhone)}</td></tr>` : ""}
        <tr><td style="padding:8px 0;font-weight:600;">Total:</td><td style="font-weight:bold;color:#059669;">${fmtMoney(d.totalArs)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600;">Método de entrega:</td><td>${d.shippingMethod === "pickup" ? "🏪 Retiro en tienda" : "🚚 Envío a domicilio"}</td></tr>
        ${d.deliveryAddress ? `<tr><td style="padding:8px 0;font-weight:600;">Dirección:</td><td>${escapeHtml(d.deliveryAddress)}</td></tr>` : ""}
      </table>
      ${itemRows ? `<h3 style="border-bottom:2px solid #e5e7eb;padding-bottom:8px;">Productos</h3><table style="width:100%;">${itemRows}</table>` : ""}
    </td></tr>
    ${footerBlock()}`;
  return {
    subject: `🔔 Nuevo pedido #${d.orderId} — ${escapeHtml(d.customerName)} — ${fmtMoney(d.totalArs)}`,
    html: wrapLayout(body),
  };
}
