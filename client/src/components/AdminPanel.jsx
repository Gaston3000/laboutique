import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { categoryTree } from "./categoryTree";
import TicketsPanel from "./TicketsPanel";
import AnalyticsDatePicker from "./AnalyticsDatePicker";

function flattenCategoryNames(nodes, output = []) {
  for (const node of nodes) {
    if (typeof node === "string") {
      output.push(node);
      continue;
    }

    if (node?.name) {
      output.push(node.name);
    }

    if (Array.isArray(node?.children) && node.children.length) {
      flattenCategoryNames(node.children, output);
    }
  }

  return output;
}

function defaultSeoForm() {
  return {
    metaTitle: "",
    metaDescription: "",
    imageAlt: "",
    slug: "",
    canonicalUrl: "",
    focusKeyword: "",
    keywordsText: "",
    ogTitle: "",
    ogDescription: "",
    twitterTitle: "",
    twitterDescription: ""
  };
}

function normalizeSeoForm(seo) {
  const source = seo && typeof seo === "object" ? seo : {};
  const keywords = Array.isArray(source.keywords)
    ? source.keywords.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  return {
    metaTitle: String(source.metaTitle || ""),
    metaDescription: String(source.metaDescription || ""),
    imageAlt: String(source.imageAlt || ""),
    slug: String(source.slug || ""),
    canonicalUrl: String(source.canonicalUrl || ""),
    focusKeyword: String(source.focusKeyword || ""),
    keywordsText: keywords.join(", "),
    ogTitle: String(source.ogTitle || ""),
    ogDescription: String(source.ogDescription || ""),
    twitterTitle: String(source.twitterTitle || ""),
    twitterDescription: String(source.twitterDescription || "")
  };
}

function buildSeoPayload(seoForm) {
  const keywords = String(seoForm.keywordsText || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    metaTitle: String(seoForm.metaTitle || "").trim(),
    metaDescription: String(seoForm.metaDescription || "").trim(),
    imageAlt: String(seoForm.imageAlt || "").trim(),
    slug: String(seoForm.slug || "").trim(),
    canonicalUrl: String(seoForm.canonicalUrl || "").trim(),
    focusKeyword: String(seoForm.focusKeyword || "").trim(),
    keywords,
    ogTitle: String(seoForm.ogTitle || "").trim(),
    ogDescription: String(seoForm.ogDescription || "").trim(),
    twitterTitle: String(seoForm.twitterTitle || "").trim(),
    twitterDescription: String(seoForm.twitterDescription || "").trim()
  };
}

function buildEditorForm(product) {
  if (!product) {
    return {
      name: "",
      shortDescription: "",
      longDescription: "",
      brand: "",
      price: "",
      stock: "",
      lowStockThreshold: "10",
      isVisible: true,
      categories: [],
      media: [],
      seo: defaultSeoForm()
    };
  }

  return {
    name: product.name || "",
    shortDescription: product.shortDescription || "",
    longDescription: product.longDescription || "",
    brand: product.brand || "",
    price: String(product.price ?? ""),
    stock: String(product.stock ?? 0),
    lowStockThreshold: String(product.lowStockThreshold ?? 10),
    isVisible: product.isVisible !== false,
    categories: Array.isArray(product.categories) ? product.categories : [],
    media: Array.isArray(product.media) ? product.media.map((item) => ({
      ...item,
      alt: String(item?.alt || "")
    })) : [],
    seo: normalizeSeoForm(product.seo)
  };
}

function normalizeCategoryName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeAdminSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAdminProductSearchText(product) {
  const categoryText = getProductCategoryNames(product).join(" ");

  return [
    product?.name,
    product?.brand,
    categoryText
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");
}

function matchesAdminProductSearch(product, query) {
  const normalizedQuery = normalizeAdminSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const normalizedText = normalizeAdminSearchText(getAdminProductSearchText(product));

  if (!normalizedText) {
    return false;
  }

  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const compactText = normalizedText.replace(/\s+/g, "");

  if (normalizedText.includes(normalizedQuery) || (compactQuery.length >= 3 && compactText.includes(compactQuery))) {
    return true;
  }

  const tokens = normalizedQuery.split(/\s+/).filter((token) => token.length >= 2);

  if (!tokens.length) {
    return false;
  }

  const requiredMatches = Math.max(1, Math.ceil(tokens.length * 0.6));
  let matched = 0;

  for (const token of tokens) {
    if (normalizedText.includes(token) || compactText.includes(token)) {
      matched += 1;

      if (matched >= requiredMatches) {
        return true;
      }
    }
  }

  return false;
}

function getProductCategoryNames(product) {
  if (!Array.isArray(product?.categories)) {
    return [];
  }

  return product.categories
    .map((category) => {
      if (typeof category === "string") {
        return category;
      }

      if (category && typeof category === "object") {
        return category.name;
      }

      return "";
    })
    .map((categoryName) => String(categoryName || "").trim())
    .filter(Boolean);
}

function formatOrderCurrency(value, currency = "ARS") {
  const numeric = Number(value || 0);
  const safeCurrency = String(currency || "ARS").toUpperCase();

  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 2
    }).format(numeric);
  } catch {
    return `${safeCurrency} ${numeric.toLocaleString("es-AR")}`;
  }
}

function formatOrderDateTime(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

function formatCustomerDateTime(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString("es-AR");
}

function formatPaymentMethodLabel(method) {
  const m = String(method || "").trim().toLowerCase();
  if (m === "cash") return "Pago al retirar";
  if (m === "mercadopago") return "Mercado Pago";
  if (!m) return "-";
  return method;
}

function normalizeOrderPaymentStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized.includes("no pagado")
    || normalized.includes("unpaid")
    || normalized.includes("pendiente")
    || normalized.includes("pending")
    || normalized.includes("rejected")
    || normalized.includes("cancel")
    || normalized.includes("failed")
  ) {
    return "No pagado";
  }

  if (normalized.includes("pagado") || normalized.includes("paid") || normalized.includes("approved")) {
    return "Pagado";
  }

  return "No pagado";
}

function normalizeOrderFulfillmentStatus(value, orderStatus = "") {
  const normalized = String(value || "").trim().toLowerCase();
  const normalizedOrderStatus = String(orderStatus || "").trim().toLowerCase();

  if (
    normalizedOrderStatus.includes("preparado")
    || normalizedOrderStatus.includes("listo_retiro")
    || normalizedOrderStatus.includes("enviado")
    || normalizedOrderStatus.includes("entregado")
  ) {
    return "Cumplido";
  }

  if (
    normalized.includes("no procesado")
    || normalized.includes("unfulfilled")
    || normalized.includes("pendiente")
    || normalized.includes("pending")
    || normalized.includes("sin proces")
  ) {
    return "No procesado";
  }

  if (
    normalized.includes("cumplido")
    || normalized.includes("fulfilled")
    || normalized.includes("procesado")
    || normalized.includes("enviado")
    || normalized.includes("entregado")
    || normalized.includes("preparado")
  ) {
    return "Cumplido";
  }

  return "No procesado";
}

function orderStatusBadgeTone(label) {
  if (label === "Pagado" || label === "Cumplido") return "is-positive";
  if (label === "Confirmado" || label === "Listo para retiro") return "is-positive";
  if (label === "Cancelado") return "is-negative";
  return "is-negative";
}

const ORDER_STATUS_ICONS = {
  nuevo: "🆕",
  pago: "💰",
  preparado: "📦",
  listo_retiro: "🏪",
  enviado: "🚚",
  entregado: "✔️",
  cancelado: "❌",
};

const ORDER_STATUS_LABELS = {
  nuevo: "Nuevo",
  pago: "Pagado",
  preparado: "En preparación",
  listo_retiro: "Listo para retiro",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

function getOrderStatusFlow(shippingMethod, customerAddress) {
  const method = String(shippingMethod || "").trim().toLowerCase();
  const isPickup = method === "pickup" || String(customerAddress || "").toLowerCase().includes("retiro en el local");
  if (isPickup) {
    return ["nuevo", "pago", "preparado", "listo_retiro", "entregado", "cancelado"];
  }
  return ["nuevo", "pago", "preparado", "enviado", "entregado", "cancelado"];
}

function derivePaymentBadge(orderStatus) {
  const s = String(orderStatus || "").trim().toLowerCase();
  if (["pago", "preparado", "listo_retiro", "enviado", "entregado"].includes(s)) {
    return "Pagado";
  }
  if (s === "cancelado") return "Cancelado";
  return "No pagado";
}

function deriveFulfillmentBadge(orderStatus, shippingMethod, customerAddress) {
  const s = String(orderStatus || "").trim().toLowerCase();
  const method = String(shippingMethod || "").trim().toLowerCase();
  const isPickup = method === "pickup" || String(customerAddress || "").toLowerCase().includes("retiro en el local");

  if (s === "entregado") return "Entregado";
  if (s === "cancelado") return "Cancelado";
  if (isPickup) {
    if (s === "listo_retiro") return "Listo para retiro";
    if (s === "preparado") return "En preparación";
  } else {
    if (s === "enviado") return "Enviado";
    if (s === "preparado") return "En preparación";
  }
  return "No procesado";
}

function derivedBadgeTone(label) {
  if (["Pagado", "Entregado", "Listo para retiro", "Enviado"].includes(label)) return "is-positive";
  if (["En preparación"].includes(label)) return "is-warning";
  if (["Cancelado"].includes(label)) return "is-cancelled";
  return "is-negative";
}

function formatAnalyticsNumber(value) {
  return Number(value || 0).toLocaleString("es-AR");
}

function formatAnalyticsPercent(value) {
  const numeric = Number(value || 0);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(1)}%`;
}

function formatAnalyticsShare(value, total) {
  const numericValue = Number(value || 0);
  const numericTotal = Number(total || 0);
  if (numericTotal <= 0) {
    return "0%";
  }

  const share = (numericValue / numericTotal) * 100;
  return `${Math.round(share)}%`;
}

function formatAnalyticsDeviceLabel(device) {
  const normalized = String(device || "").trim().toLowerCase();
  if (!normalized) {
    return "Otro";
  }

  if (normalized.includes("desktop") || normalized.includes("escritorio")) {
    return "Escritorio";
  }

  if (normalized.includes("mobile") || normalized.includes("movil") || normalized.includes("móvil")) {
    return "Móvil";
  }

  if (normalized.includes("tablet")) {
    return "Tablet";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatAnalyticsBrowserLabel(browser) {
  const normalized = String(browser || "").trim().toLowerCase();
  if (!normalized) {
    return "Otro";
  }

  const labels = {
    chrome: "Chrome",
    safari: "Safari",
    edge: "Edge",
    firefox: "Firefox",
    opera: "Opera",
    samsung: "Samsung Internet"
  };

  return labels[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatAnalyticsOperatingSystemLabel(os) {
  const normalized = String(os || "").trim().toLowerCase();
  if (!normalized) {
    return "Otro";
  }

  const labels = {
    windows: "Windows",
    android: "Android",
    ios: "iOS",
    macos: "macOS",
    linux: "Linux"
  };

  return labels[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildAnalyticsDonutGradient(items, total, colors) {
  let currentAngle = 0;

  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const numericValue = Number(item?.sessions || 0);
      const share = total > 0 ? numericValue / total : 0;
      const angle = share * 360;
      const startAngle = currentAngle;
      const endAngle = startAngle + angle;
      currentAngle = endAngle;
      return `${colors[index % colors.length]} ${startAngle}deg ${endAngle}deg`;
    })
    .join(", ");
}

function formatAnalyticsDuration(valueInSeconds) {
  const totalSeconds = Math.max(0, Math.round(Number(valueInSeconds || 0)));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function normalizeAnalyticsPath(path) {
  const text = String(path || "").trim();
  return text || "/";
}

function formatAnalyticsDay(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value || "-");
  }

  return parsed.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short"
  });
}

function weekdayLabel(weekday) {
  const labels = {
    1: "Lun",
    2: "Mar",
    3: "Mié",
    4: "Jue",
    5: "Vie",
    6: "Sáb",
    7: "Dom"
  };

  return labels[Number(weekday)] || "-";
}

function buildSparklinePoints(values, width = 120, height = 34) {
  const series = Array.isArray(values) ? values : [];
  if (!series.length) {
    return "";
  }

  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = Math.max(1, max - min);
  const denominator = Math.max(1, series.length - 1);

  return series
    .map((value, index) => {
      const x = (index / denominator) * width;
      const normalized = (Number(value || 0) - min) / range;
      const y = height - normalized * (height - 4) - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildLineCoordinates(values, width = 620, height = 220) {
  const series = Array.isArray(values) ? values : [];
  if (!series.length) {
    return [];
  }

  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = Math.max(1, max - min);
  const denominator = Math.max(1, series.length - 1);

  return series.map((value, index) => {
    const x = (index / denominator) * width;
    const normalized = (Number(value || 0) - min) / range;
    const y = height - normalized * (height - 10) - 5;

    return { x, y };
  });
}

function formatTrafficSourceName(value) {
  const source = String(value || "").trim().toLowerCase();

  if (!source || source === "directo" || source === "direct" || source === "(direct)") {
    return "Directa";
  }

  const knownSources = {
    google: "Google",
    instagram: "Instagram",
    facebook: "Facebook",
    whatsapp: "WhatsApp",
    youtube: "YouTube",
    tiktok: "TikTok",
  };

  if (knownSources[source]) {
    return knownSources[source];
  }

  return source
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTrafficChannelLabel(value) {
  const channel = String(value || "").trim().toLowerCase();
  if (!channel || channel === "directo" || channel === "direct") {
    return "";
  }

  if (channel === "orgánico" || channel === "organic") {
    return "Orgánica";
  }

  if (channel === "social") {
    return "Social";
  }

  if (channel === "referral") {
    return "Referido";
  }

  if (channel === "paid" || channel === "pago") {
    return "Pago";
  }

  if (channel === "email") {
    return "Email";
  }

  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

function customerInitials(name) {
  const text = String(name || "").trim();
  if (!text) {
    return "CL";
  }

  const words = text.split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("");
  return initials || "CL";
}

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function isOrderInCreatedDateRange(createdAt, mode, customDate) {
  if (mode === "all") {
    return true;
  }

  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) {
    return false;
  }

  if (mode === "custom") {
    if (!customDate) {
      return true;
    }

    return toDateInputValue(createdDate) === customDate;
  }

  const now = new Date();

  if (mode === "last_7_days") {
    const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
    const to = endOfDay(now);
    return createdDate >= from && createdDate <= to;
  }

  if (mode === "last_14_days") {
    const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13));
    const to = endOfDay(now);
    return createdDate >= from && createdDate <= to;
  }

  if (mode === "last_month") {
    const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    return createdDate >= monthStart && createdDate <= monthEnd;
  }

  return true;
}

function isOrderInCustomDateRange(createdAt, fromDate, toDate) {
  if (!fromDate && !toDate) {
    return true;
  }

  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) {
    return false;
  }

  if (fromDate) {
    const from = startOfDay(new Date(`${fromDate}T00:00:00`));
    if (createdDate < from) {
      return false;
    }
  }

  if (toDate) {
    const to = endOfDay(new Date(`${toDate}T00:00:00`));
    if (createdDate > to) {
      return false;
    }
  }

  return true;
}

function hasValue(value) {
  return String(value || "").trim().length > 0;
}

function normalizeComparableText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveOrderLineImageUrl(line, products) {
  const lineName = normalizeComparableText(line?.productName);

  if (!lineName) {
    return "/fotos/foto-inicio.webp";
  }

  const matchingProduct = (products || []).find((product) => {
    const productName = normalizeComparableText(product?.name);
    return productName && (productName === lineName || lineName.includes(productName) || productName.includes(lineName));
  });

  const firstMedia = Array.isArray(matchingProduct?.media)
    ? matchingProduct.media.find((item) => item && typeof item === "object" && item.url)
    : null;

  return firstMedia?.url || "/fotos/foto-inicio.webp";
}

function buildOrderActivityItems(order, paymentLabel, fulfillmentLabel) {
  const activity = [
    {
      id: `created-${order.id}`,
      title: "Pedido creado",
      detail: `Pedido #${order.wixOrderNumber || order.id}`,
      at: order.createdAt
    },
    {
      id: `payment-${order.id}`,
      title: `Estado de pago: ${paymentLabel}`,
      detail: formatPaymentMethodLabel(order.paymentMethod) || "Método de pago no especificado",
      at: order.createdAt
    },
    {
      id: `fulfillment-${order.id}`,
      title: `Cumplimiento: ${fulfillmentLabel}`,
      detail: order.shippingMethod || "Método de envío no especificado",
      at: order.createdAt
    }
  ];

  if (hasValue(order.trackingNumber)) {
    activity.push({
      id: `tracking-${order.id}`,
      title: "Número de seguimiento registrado",
      detail: order.trackingNumber,
      at: order.createdAt
    });
  }

  return activity;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function openPrintableOrderDocument(order, type = "invoice", invoiceMeta = null, targetPopup = null, options = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const { returnHtml = false } = options;

  const title = type === "receipt" ? "Recibo" : "Factura";
  const orderNumber = String(order.wixOrderNumber || order.id || "-");
  const persistedInvoiceNumber = Number(
    invoiceMeta?.invoiceNumber
    || order.invoiceNumber
    || 0
  );
  const numericOrderId = Number.parseInt(String(order.id || "").replace(/\D/g, ""), 10);
  const numericWixOrder = Number.parseInt(String(order.wixOrderNumber || "").replace(/\D/g, ""), 10);
  const invoiceSequential = Number.isFinite(numericOrderId) && numericOrderId > 0
    ? numericOrderId
    : (Number.isFinite(numericWixOrder) && numericWixOrder > 0 ? numericWixOrder : 1);
  const resolvedInvoiceNumber = persistedInvoiceNumber > 0 ? persistedInvoiceNumber : invoiceSequential;
  const invoiceNumber = String(resolvedInvoiceNumber).padStart(7, "0");
  const sanitizedOrderNumber = orderNumber.replace(/[^0-9a-zA-Z_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const safeOrderNumber = sanitizedOrderNumber || "pedido";
  const fileName = `${type === "receipt" ? "recibo" : "factura"}-${safeOrderNumber}.pdf`;

  const issueDateSource = invoiceMeta?.issuedAt || order.invoiceCreatedAt || order.createdAt;
  const issueDate = issueDateSource ? new Date(issueDateSource) : new Date();
  const safeIssueDate = Number.isNaN(issueDate.getTime()) ? new Date() : issueDate;
  const dueDate = new Date(safeIssueDate);
  dueDate.setDate(dueDate.getDate() + 30);

  const currency = String(order.currency || "ARS").toUpperCase();
  const lines = Array.isArray(order.lines) ? order.lines : [];
  const itemsSubtotal = lines.reduce((acc, line) => acc + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0);
  const shippingCost = Number(order.shippingCost || 0);
  const subtotal = itemsSubtotal + shippingCost;
  const taxTotal = Number(order.taxTotal || 0);
  const orderTotalRaw = Number(order.total || 0);
  const orderTotal = orderTotalRaw > 0 ? orderTotalRaw : Math.max(0, subtotal + taxTotal);
  const discountRaw = Number(order.discount || 0);
  const discount = discountRaw !== 0
    ? Math.abs(discountRaw)
    : Math.max(0, subtotal + taxTotal - orderTotal);
  const taxableBase = Math.max(0, subtotal - discount);
  const taxRate = taxableBase > 0 ? (taxTotal / taxableBase) * 100 : 0;

  const paymentLabel = normalizeOrderPaymentStatus(order.paymentStatus);
  const paidAmount = Number(order.amountPaid || order.paidAmount || 0) > 0
    ? Number(order.amountPaid || order.paidAmount || 0)
    : (paymentLabel === "Pagado" ? orderTotal : 0);
  const balanceDue = Math.max(0, orderTotal - paidAmount);

  const formatMoney = (value) => `${Number(value || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  const formatPrintableDate = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };
  const buildAddress = (...parts) => parts.filter(hasValue).join(", ");

  const customerName = escapeHtml(order.customerName || "-");
  const customerEmail = escapeHtml(order.contactEmail || "-");
  const customerPhone = escapeHtml(order.customerPhone || order.recipientPhone || "-");

  const billingName = customerName;
  const billingAddress = escapeHtml(buildAddress(
    order.billingAddress || order.customerAddress,
    order.billingCity || order.shippingCity,
    order.billingState || order.shippingState,
    order.billingPostalCode || order.shippingPostalCode,
    order.billingCountry || order.shippingCountry
  ) || "-");

  const shippingAddress = escapeHtml(buildAddress(
    order.customerAddress || order.shippingAddress || order.billingAddress,
    order.shippingCity,
    order.shippingState,
    order.shippingPostalCode,
    order.shippingCountry
  ) || "-");

  const lineRows = lines
    .map((line) => {
      const quantity = Number(line.quantity || 0);
      const unitPrice = Number(line.unitPrice || 0);
      const lineTotal = quantity * unitPrice;

      return `
        <tr>
          <td>${escapeHtml(line.productName || "Producto")}</td>
          <td>${quantity}</td>
          <td>${escapeHtml(formatMoney(unitPrice))}</td>
          <td>${escapeHtml(formatMoney(lineTotal))}</td>
        </tr>
      `;
    })
    .join("");

  const logoUrl = `${window.location.origin}/fotos/logo/La%20boutique%20de%20la%20limpiezalogo.webp`;
  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title} n.° ${invoiceNumber}</title>
        <style>
          :root {
            color-scheme: light;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #4f556f;
            color: #101634;
            font-family: Inter, "Segoe UI", Roboto, Arial, sans-serif;
          }

          .invoice-page {
            position: relative;
            margin: 22px;
            background: #f8f9fb;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 20px 44px rgba(8, 15, 40, 0.22);
          }

          .payment-chip {
            position: absolute;
            top: 0;
            left: 74px;
            transform: translateY(-50%);
            padding: 8px 24px;
            border-radius: 3px;
            color: #ffffff;
            font-size: 40px;
            font-size: 1.12rem;
            font-weight: 700;
            letter-spacing: 0.01em;
            background: ${paymentLabel === "Pagado" ? "#57a863" : "#d97706"};
          }

          .invoice-body {
            padding: 74px 78px 54px;
            display: grid;
            gap: 34px;
          }

          .top-grid {
            display: grid;
            grid-template-columns: minmax(340px, 1fr) minmax(320px, 0.95fr);
            gap: 24px;
            align-items: start;
          }

          .brand-logo {
            width: 180px;
            height: auto;
            margin-bottom: 18px;
            object-fit: contain;
          }

          .brand-block p,
          .meta-col p,
          .address-grid p {
            margin: 0;
            line-height: 1.34;
          }

          .brand-block strong,
          .address-grid strong,
          .totals-title,
          .totals-strong {
            font-weight: 700;
          }

          .brand-block {
            display: grid;
            gap: 2px;
            color: #4f556f;
            font-size: 1rem;
          }

          .brand-block strong {
            color: #2d324d;
            font-size: 1.04rem;
            margin-bottom: 2px;
          }

          .meta-col {
            text-align: right;
            color: #4f556f;
            font-size: 1rem;
            display: grid;
            justify-items: end;
            gap: 6px;
          }

          .meta-col h1 {
            margin: 0 0 10px;
            color: #0f1534;
            font-size: 2.05rem;
            font-weight: 700;
            letter-spacing: 0.01em;
          }

          .divider {
            border: 0;
            border-top: 1px solid #d8deeb;
            margin: 0;
          }

          .address-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 30px;
            color: #4f556f;
            font-size: 1rem;
          }

          .address-grid h3 {
            margin: 0 0 7px;
            color: #8087a3;
            font-size: 1rem;
            font-weight: 700;
          }

          .address-grid strong {
            color: #2d324d;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            color: #141a38;
          }

          .items-table thead th {
            background: #d5def1;
            text-align: left;
            font-size: 1.01rem;
            font-weight: 700;
            padding: 18px 20px;
          }

          .items-table thead th:nth-child(1) {
            width: 47%;
          }

          .items-table tbody td {
            padding: 24px 20px;
            border-bottom: 1px solid #d9deea;
            font-size: 1.01rem;
            line-height: 1.35;
          }

          .items-table tbody tr:last-child td {
            border-bottom: 1px solid #d9deea;
          }

          .totals-wrap {
            display: flex;
            justify-content: flex-end;
          }

          .totals-card {
            width: min(100%, 600px);
            color: #1a1f3c;
            font-size: 1rem;
          }

          .totals-row {
            display: grid;
            grid-template-columns: minmax(170px, 1fr) auto;
            gap: 20px;
            align-items: center;
            padding: 8px 0;
          }

          .totals-row span:last-child,
          .totals-row strong:last-child {
            text-align: right;
            min-width: 170px;
          }

          .totals-title {
            margin: 14px 0 4px;
            font-size: 1.06rem;
          }

          .totals-strong {
            font-size: 1.01rem;
          }

          .totals-divider {
            border: 0;
            border-top: 1px solid #d8deeb;
            margin: 14px 0;
          }

          .balance-row {
            margin-top: 8px;
            border: 1px solid #d4deef;
            border-radius: 12px;
            background: #edf2f8;
            padding: 12px 16px;
          }

          .balance-row span:last-child {
            color: #0f1638;
            font-size: 1.85rem;
            font-weight: 700;
          }

          @media print {
            html,
            body {
              background: #ffffff;
            }

            .invoice-page {
              margin: 0;
              border-radius: 0;
              box-shadow: none;
            }

            .payment-chip {
              left: 58px;
            }
          }
        </style>
      </head>
      <body>
        <main class="invoice-page">
          <span class="payment-chip">${escapeHtml(paymentLabel)}</span>

          <section class="invoice-body">
            <section class="top-grid">
              <div>
                <img src="${escapeHtml(logoUrl)}" alt="La Boutique de la Limpieza" class="brand-logo" />
                <div class="brand-block">
                  <strong>La Boutique de la Limpieza®</strong>
                  <p>Acevedo 200</p>
                  <p>Buenos Aires, Buenos Aires C1414</p>
                  <p>Argentina</p>
                  <p>laboutiqueacevedo200@gmail.com</p>
                  <p>Teléfono: 011 15 5501-8399</p>
                </div>
              </div>

              <div class="meta-col">
                <h1>${title} n.° ${escapeHtml(invoiceNumber)}</h1>
                <p>${title} por pedido: n.°${escapeHtml(orderNumber)}</p>
                <p>Fecha de emisión: ${escapeHtml(formatPrintableDate(safeIssueDate))}</p>
                <p>Fecha de vencimiento: ${escapeHtml(formatPrintableDate(dueDate))}</p>
              </div>
            </section>

            <hr class="divider" />

            <section class="address-grid">
              <article>
                <h3>Facturar a:</h3>
                <p><strong>${billingName}</strong></p>
                <p>${billingAddress}</p>
              </article>

              <article>
                <h3>Enviar a:</h3>
                <p>${shippingAddress}</p>
              </article>

              <article>
                <h3>Información adicional del cliente:</h3>
                <p>${customerEmail}</p>
                <p>Teléfono: ${customerPhone}</p>
              </article>
            </section>

            <table class="items-table" aria-label="Detalle de productos facturados">
              <thead>
                <tr>
                  <th>Producto o servicio</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${lineRows || '<tr><td colspan="4">Sin ítems cargados para este pedido.</td></tr>'}
              </tbody>
            </table>

            <section class="totals-wrap">
              <div class="totals-card">
                <div class="totals-row">
                  <strong class="totals-strong">Subtotal</strong>
                  <strong class="totals-strong">${escapeHtml(formatMoney(subtotal))}</strong>
                </div>
                <div class="totals-row">
                  <span>Descuento</span>
                  <span>${escapeHtml(`-${formatMoney(discount)}`)}</span>
                </div>

                <hr class="totals-divider" />

                <h2 class="totals-title">Desglose de impuestos</h2>
                <div class="totals-row">
                  <span>Impuesto (${escapeHtml(`${taxRate.toFixed(0)}%`)})</span>
                  <span>${escapeHtml(formatMoney(taxTotal))}</span>
                </div>
                <div class="totals-row">
                  <span>Total de impuestos</span>
                  <span>${escapeHtml(formatMoney(taxTotal))}</span>
                </div>

                <hr class="totals-divider" />

                <div class="totals-row">
                  <span>Total factura</span>
                  <span>${escapeHtml(formatMoney(orderTotal))}</span>
                </div>
                <div class="totals-row">
                  <span>Monto pagado</span>
                  <span>${escapeHtml(formatMoney(paidAmount))}</span>
                </div>

                <div class="totals-row balance-row">
                  <span>Saldo adeudado</span>
                  <span>${escapeHtml(formatMoney(balanceDue))}</span>
                </div>
              </div>
            </section>
          </section>
        </main>
      </body>
    </html>
  `;

  if (returnHtml) {
    return {
      html,
      fileName,
      orderNumber,
      invoiceNumber,
      title
    };
  }

  const popup = targetPopup && !targetPopup.closed
    ? targetPopup
    : window.open("", "_blank", "width=1024,height=768,scrollbars=yes,resizable=yes");
  if (!popup) {
    return;
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();

  return popup;
}

async function downloadOrderDocumentAsPdf(order, type = "invoice", invoiceMeta = null) {
  if (typeof window === "undefined") {
    return;
  }

  const printableDocument = openPrintableOrderDocument(order, type, invoiceMeta, null, { returnHtml: true });
  if (!printableDocument?.html) {
    throw new Error("No se pudo preparar el documento para PDF.");
  }

  const html2pdfModule = await import("html2pdf.js");
  const html2pdf = html2pdfModule?.default || html2pdfModule;

  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(printableDocument.html, "text/html");
  const invoicePage = parsedDocument.querySelector(".invoice-page");
  if (!invoicePage) {
    throw new Error("No se pudo renderizar el contenido del PDF.");
  }

  const styleContent = Array.from(parsedDocument.querySelectorAll("style"))
    .map((node) => node.textContent || "")
    .join("\n");

  const pdfRoot = document.createElement("div");
  pdfRoot.style.position = "fixed";
  pdfRoot.style.left = "-200vw";
  pdfRoot.style.top = "0";
  pdfRoot.style.width = "794px";
  pdfRoot.style.background = "#ffffff";
  pdfRoot.style.zIndex = "-1";

  const styles = document.createElement("style");
  styles.textContent = styleContent;
  pdfRoot.append(styles);
  pdfRoot.append(invoicePage.cloneNode(true));
  document.body.append(pdfRoot);

  try {
    await html2pdf()
      .set({
        filename: printableDocument.fileName,
        margin: 0,
        pagebreak: { mode: ["css", "legacy"] },
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff"
        },
        jsPDF: {
          unit: "pt",
          format: "a4",
          orientation: "portrait"
        }
      })
      .from(pdfRoot)
      .save();
  } finally {
    pdfRoot.remove();
  }
}

function openPendingInvoiceWindow() {
  if (typeof window === "undefined") {
    return null;
  }

  const popup = window.open("", "_blank", "width=1024,height=768,scrollbars=yes,resizable=yes");
  if (!popup) {
    return null;
  }

  popup.document.open();
  popup.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Generando factura...</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #f4f6fb;
            color: #1f2a44;
            font-family: Inter, "Segoe UI", Arial, sans-serif;
          }

          p {
            margin: 0;
            font-size: 1.05rem;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <p>Generando factura...</p>
      </body>
    </html>
  `);
  popup.document.close();

  return popup;
}

const sections = [
  "Tickets",
  "Pedidos",
  "Productos",
  "Inventario",
  "Categorías",
  "Envíos",
  "Promociones",
  "Miembros",
  "Clientes",
  "Administradores",
  "Analíticas",
  "Reportes"
];
const sectionIcons = {
  Pedidos: "📦",
  Productos: "🛍️",
  Inventario: "📋",
  Categorías: "🗂️",
  Envíos: "🚚",
  Promociones: "🏷️",
  Miembros: "🧑‍🤝‍🧑",
  Clientes: "👥",
  Administradores: "🛡️",
  Analíticas: "📈",
  Reportes: "📊",
  Tickets: "🎫"
};
const MAX_MEDIA_ITEMS = 5;
const SHIPPING_ZONE_OPTIONS = [
  { value: "caba", label: "CABA" },
  { value: "gba", label: "Gran Buenos Aires" },
  { value: "retiro_local", label: "Retiro en el Local" }
];

function getShippingZoneLabel(zone) {
  const normalizedZone = String(zone || "").trim().toLowerCase();
  return SHIPPING_ZONE_OPTIONS.find((option) => option.value === normalizedZone)?.label || zone;
}

export default function AdminPanel({
  products,
  orders = [],
  categories = [],
  variantsByProduct = {},
  shippingRules = [],
  promotions = [],
  customers = [],
  members = [],
  administrators = [],
  reorderItemsByCustomer = {},
  customerActivityByCustomer = {},
  salesByProduct = [],
  salesByBrand = [],
  tickets = [],
  ticketMetrics = { open: 0, inProgress: 0, testing: 0, closed: 0 },
  isTicketsLoading = false,
  analytics = null,
  isAnalyticsLoading = false,
  lowStockAlerts = { productAlerts: [], variantAlerts: [] },
  orderNavigationRequest = null,
  notifications = [],
  unreadNotificationsCount = 0,
  onCreate,
  onUpdate,
  onUploadMedia,
  onDelete,
  onOrderStatusChange,
  onVerifyPayment,
  onSyncPayment,
  onEnsureOrderInvoice,
  onLoadVariants,
  onCreateVariant,
  onDeleteVariant,
  onCreateCategory,
  onDeleteCategory,
  onUpdateCategory,
  onUpdateShippingRule,
  onCreatePromotion,
  onApplyPromotion,
  onLoadCustomerReorder,
  onLoadCustomerActivity,
  onDeleteMember,
  onDeleteMembersBulk,
  onCreateTicket,
  onUpdateTicket,
  onAddTicketComment,
  onCloseTicket,
  onDeleteTicket,
  onReloadTickets,
  onReloadAnalytics,
  onFetchUserSessions,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  message
}) {
  const [editorMode, setEditorMode] = useState(null);
  const [editorId, setEditorId] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorForm, setEditorForm] = useState(() => buildEditorForm(null));
  const [mediaUploadError, setMediaUploadError] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggingMediaIndex, setDraggingMediaIndex] = useState(null);
  const [dropTargetMediaIndex, setDropTargetMediaIndex] = useState(null);
  const [editorToast, setEditorToast] = useState("");
  const [isToastLeaving, setIsToastLeaving] = useState(false);
  const editorRef = useRef(null);
  const mediaInputRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const categoryUndoTimeoutRef = useRef(null);
  const [activeSection, setActiveSection] = useState("Pedidos");
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [editorVariantForm, setEditorVariantForm] = useState({
    optionName: "",
    optionValue: "",
    sku: "",
    priceDelta: "0",
    stock: "0",
    lowStockThreshold: "5"
  });
  const [editingShippingRuleId, setEditingShippingRuleId] = useState(null);
  const [editingShippingRuleForm, setEditingShippingRuleForm] = useState({
    baseCost: "",
    freeShippingFrom: "",
    etaMinDays: "",
    etaMaxDays: ""
  });
  const [promoForm, setPromoForm] = useState({ code: "", name: "", type: "percent", value: "0", minSubtotal: "" });
  const [promoTest, setPromoTest] = useState({ code: "", subtotal: "0" });
  const [promoTestResult, setPromoTestResult] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategoryCreateOpen, setIsCategoryCreateOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [isEditingCategoryTitle, setIsEditingCategoryTitle] = useState(false);
  const [categoryTitleDraft, setCategoryTitleDraft] = useState("");
  const [isSavingCategoryTitle, setIsSavingCategoryTitle] = useState(false);
  const [isAddCategoryProductsOpen, setIsAddCategoryProductsOpen] = useState(false);
  const [categoryProductSearch, setCategoryProductSearch] = useState("");
  const [selectedCategoryProductIds, setSelectedCategoryProductIds] = useState([]);
  const [isSavingCategoryProducts, setIsSavingCategoryProducts] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("30d");
  const [analyticsDateRange, setAnalyticsDateRange] = useState(null);
  const [isReloadingAnalytics, setIsReloadingAnalytics] = useState(false);
  const [isUserActivityOpen, setIsUserActivityOpen] = useState(false);
  const [userActivityData, setUserActivityData] = useState(null);
  const [isUserActivityLoading, setIsUserActivityLoading] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [userActivityFilter, setUserActivityFilter] = useState("all");
  const [isUserActivityFilterOpen, setIsUserActivityFilterOpen] = useState(false);
  const userActivityFilterRef = useRef(null);
  const [removingCategoryProductId, setRemovingCategoryProductId] = useState(null);
  const [categoryRemovalUndo, setCategoryRemovalUndo] = useState(null);
  const [adminProductSearch, setAdminProductSearch] = useState("");
  const [openProductMenuId, setOpenProductMenuId] = useState(null);
  const [isProductFiltersOpen, setIsProductFiltersOpen] = useState(false);
  const [productStockFilter, setProductStockFilter] = useState("all");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productVisibilityFilter, setProductVisibilityFilter] = useState("all");
  const [inventoryDraftById, setInventoryDraftById] = useState({});
  const [inventoryPriceDraftById, setInventoryPriceDraftById] = useState({});
  const [inventorySavingById, setInventorySavingById] = useState({});
  const [inventoryErrorsById, setInventoryErrorsById] = useState({});
  const [inventorySelectedIds, setInventorySelectedIds] = useState(new Set());
  const [inventoryBulkSaving, setInventoryBulkSaving] = useState(false);
  const [bulkPriceValue, setBulkPriceValue] = useState("");
  const [bulkStockValue, setBulkStockValue] = useState("");
  const [isInventoryFiltersOpen, setIsInventoryFiltersOpen] = useState(false);
  const [inventoryStockFilter, setInventoryStockFilter] = useState("all");
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("all");
  const [inventoryVisibilityFilter, setInventoryVisibilityFilter] = useState("all");
  const [reportSearch, setReportSearch] = useState("");
  const [reportAlertStatusFilter, setReportAlertStatusFilter] = useState("all");
  const [reportAlertTypeFilter, setReportAlertTypeFilter] = useState("all");
  const [isSeoOpen, setIsSeoOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isOrderActionsOpen, setIsOrderActionsOpen] = useState(false);
  const [isOrderPrintMenuOpen, setIsOrderPrintMenuOpen] = useState(false);
  const [orderActionMessage, setOrderActionMessage] = useState("");
  const [paymentVerification, setPaymentVerification] = useState(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [isSyncingPayment, setIsSyncingPayment] = useState(false);
  const [fulfillmentConfirmOrder, setFulfillmentConfirmOrder] = useState(null);
  const [fulfillmentConfirmMarkPaid, setFulfillmentConfirmMarkPaid] = useState(false);
  const [fulfillmentConfirmSendReadyEmail, setFulfillmentConfirmSendReadyEmail] = useState(false);
  const [isSubmittingFulfillmentConfirm, setIsSubmittingFulfillmentConfirm] = useState(false);
  const [isOrderFiltersOpen, setIsOrderFiltersOpen] = useState(false);
  const [orderCreatedDateMode, setOrderCreatedDateMode] = useState("all");
  const [orderCreatedDateFromFilter, setOrderCreatedDateFromFilter] = useState("");
  const [orderCreatedDateToFilter, setOrderCreatedDateToFilter] = useState("");
  const [orderFulfillmentFilter, setOrderFulfillmentFilter] = useState("all");
  const [orderProductFilter, setOrderProductFilter] = useState("");
  const [orderShippingMethodFilter, setOrderShippingMethodFilter] = useState("all");
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const orderActionsRef = useRef(null);
  const orderPrintMenuRef = useRef(null);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const selectedCustomerActivity = useMemo(
    () => (selectedCustomerId ? customerActivityByCustomer[selectedCustomerId] || [] : []),
    [customerActivityByCustomer, selectedCustomerId]
  );

  const membersCount = useMemo(
    () => (Array.isArray(members) ? members.length : 0),
    [members]
  );

  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [memberDeleteConfirm, setMemberDeleteConfirm] = useState(null);
  const [isMemberDeleting, setIsMemberDeleting] = useState(false);
  const [memberDeleteMessage, setMemberDeleteMessage] = useState("");

  const allMembersSelected = members.length > 0 && selectedMemberIds.size === members.length;

  function toggleMemberSelection(memberId) {
    setSelectedMemberIds((current) => {
      const next = new Set(current);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }

  function toggleAllMembers() {
    if (allMembersSelected) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(members.map((m) => m.id)));
    }
  }

  async function confirmDeleteMembers() {
    if (!memberDeleteConfirm) return;
    const { ids } = memberDeleteConfirm;
    setIsMemberDeleting(true);
    setMemberDeleteMessage("");
    try {
      if (ids.length === 1) {
        await onDeleteMember(ids[0]);
      } else {
        await onDeleteMembersBulk(ids);
      }
      setSelectedMemberIds((current) => {
        const next = new Set(current);
        for (const id of ids) next.delete(id);
        return next;
      });
      setMemberDeleteMessage(ids.length === 1 ? "Usuario eliminado correctamente." : `${ids.length} usuarios eliminados correctamente.`);
    } catch (err) {
      setMemberDeleteMessage(err.message || "Error al eliminar.");
    } finally {
      setIsMemberDeleting(false);
      setMemberDeleteConfirm(null);
    }
  }

  const visibleShippingRules = useMemo(() => {
    const orderByZone = new Map(SHIPPING_ZONE_OPTIONS.map((option, index) => [option.value, index]));

    return (Array.isArray(shippingRules) ? shippingRules : [])
      .filter((rule) => orderByZone.has(String(rule?.zone || "").trim().toLowerCase()))
      .sort((left, right) => {
        const leftOrder = orderByZone.get(String(left?.zone || "").trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = orderByZone.get(String(right?.zone || "").trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder;
      });
  }, [shippingRules]);

  const customersWithOrders = useMemo(
    () => (Array.isArray(customers) ? customers.filter((customer) => Number(customer.ordersCount || 0) > 0) : []),
    [customers]
  );

  const administratorsCount = useMemo(
    () => (Array.isArray(administrators) ? administrators.length : 0),
    [administrators]
  );

  useEffect(() => {
    if (!selectedCustomerId || typeof onLoadCustomerActivity !== "function") {
      return;
    }

    if ((customerActivityByCustomer[selectedCustomerId] || []).length > 0) {
      return;
    }

    onLoadCustomerActivity(selectedCustomerId);
  }, [selectedCustomerId, onLoadCustomerActivity, customerActivityByCustomer]);

  const editorProduct = useMemo(
    () => products.find((product) => product.id === editorId) || null,
    [products, editorId]
  );

  const categoryOptions = useMemo(() => {
    const allNames = flattenCategoryNames(categoryTree);

    for (const category of categories || []) {
      if (category?.name) {
        allNames.push(category.name);
      }
    }

    for (const product of products) {
      for (const productCategory of product.categories || []) {
        allNames.push(productCategory);
      }
    }

    return Array.from(new Set(allNames));
  }, [categories, products]);

  const categoriesWithCount = useMemo(() => {
    const usageCount = products.reduce((map, product) => {
      for (const category of getProductCategoryNames(product)) {
        map.set(category, (map.get(category) || 0) + 1);
      }
      return map;
    }, new Map());

    return (categories || []).map((category) => ({
      ...category,
      productCount: Number.isFinite(category.productCount) ? category.productCount : (usageCount.get(category.name) || 0)
    }));
  }, [categories, products]);

  const selectedCategoryProducts = useMemo(() => {
    const normalizedSelectedCategory = normalizeCategoryName(selectedCategoryName);

    if (!normalizedSelectedCategory) {
      return [];
    }

    return products.filter((product) => {
      const productCategories = getProductCategoryNames(product);

      return productCategories.some(
        (categoryName) => normalizeCategoryName(categoryName) === normalizedSelectedCategory
      );
    });
  }, [products, selectedCategoryName]);

  const availableProductsForSelectedCategory = useMemo(() => {
    const normalizedSelectedCategory = normalizeCategoryName(selectedCategoryName);

    if (!normalizedSelectedCategory) {
      return [];
    }

    const searchTerm = normalizeAdminSearchText(categoryProductSearch);

    return products.filter((product) => {
      const productCategories = getProductCategoryNames(product);
      const isAlreadyInCategory = productCategories.some(
        (categoryName) => normalizeCategoryName(categoryName) === normalizedSelectedCategory
      );

      if (isAlreadyInCategory) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      return matchesAdminProductSearch(product, searchTerm);
    });
  }, [products, selectedCategoryName, categoryProductSearch]);

  const selectedCategory = useMemo(() => {
    if (selectedCategoryId === null || selectedCategoryId === undefined) {
      return null;
    }

    return categoriesWithCount.find((category) => category.id === selectedCategoryId) || null;
  }, [categoriesWithCount, selectedCategoryId]);

  const filteredCategoriesWithCount = useMemo(() => {
    const normalizedSearch = normalizeCategoryName(categorySearch);

    if (!normalizedSearch) {
      return categoriesWithCount;
    }

    return categoriesWithCount.filter((category) =>
      normalizeCategoryName(category.name).includes(normalizedSearch)
    );
  }, [categoriesWithCount, categorySearch]);
  const editorVariants = editorId ? variantsByProduct[editorId] || [] : [];

  const filteredProducts = useMemo(() => {
    const term = normalizeAdminSearchText(adminProductSearch);

    if (!term) {
      return products;
    }

    return products.filter((product) => matchesAdminProductSearch(product, term));
  }, [products, adminProductSearch]);

  const inventoryCategoryOptions = useMemo(() => {
    const categoriesSet = new Set();

    for (const product of products) {
      for (const category of product.categories || []) {
        if (category) {
          categoriesSet.add(category);
        }
      }
    }

    return Array.from(categoriesSet).sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const productActiveFiltersCount = useMemo(() => {
    let count = 0;

    if (productStockFilter !== "all") {
      count += 1;
    }

    if (productCategoryFilter !== "all") {
      count += 1;
    }

    if (productVisibilityFilter !== "all") {
      count += 1;
    }

    return count;
  }, [productStockFilter, productCategoryFilter, productVisibilityFilter]);

  const filteredCatalogProducts = useMemo(() => {
    return filteredProducts.filter((product) => {
      const stock = Number(product.stock ?? 0);
      const lowStockThreshold = Number(product.lowStockThreshold ?? 10);
      const normalizedStock = Number.isFinite(stock) ? stock : 0;
      const normalizedLowStockThreshold = Number.isFinite(lowStockThreshold) ? lowStockThreshold : 10;

      if (productStockFilter === "out_of_stock" && normalizedStock > 0) {
        return false;
      }

      if (productStockFilter === "low_stock") {
        const isLowStock = normalizedStock > 0 && normalizedStock <= normalizedLowStockThreshold;
        if (!isLowStock) {
          return false;
        }
      }

      if (productStockFilter === "in_stock" && normalizedStock <= 0) {
        return false;
      }

      if (productCategoryFilter !== "all" && !(product.categories || []).includes(productCategoryFilter)) {
        return false;
      }

      const isVisible = product.isVisible !== false;
      if (productVisibilityFilter === "visible" && !isVisible) {
        return false;
      }

      if (productVisibilityFilter === "hidden" && isVisible) {
        return false;
      }

      return true;
    });
  }, [
    filteredProducts,
    productStockFilter,
    productCategoryFilter,
    productVisibilityFilter
  ]);

  const inventoryActiveFiltersCount = useMemo(() => {
    let count = 0;

    if (inventoryStockFilter !== "all") {
      count += 1;
    }

    if (inventoryCategoryFilter !== "all") {
      count += 1;
    }

    if (inventoryVisibilityFilter !== "all") {
      count += 1;
    }

    return count;
  }, [inventoryStockFilter, inventoryCategoryFilter, inventoryVisibilityFilter]);

  const filteredInventoryProducts = useMemo(() => {
    return filteredProducts.filter((product) => {
      const stock = Number(product.stock ?? 0);
      const lowStockThreshold = Number(product.lowStockThreshold ?? 10);
      const normalizedStock = Number.isFinite(stock) ? stock : 0;
      const normalizedLowStockThreshold = Number.isFinite(lowStockThreshold) ? lowStockThreshold : 10;

      if (inventoryStockFilter === "out_of_stock" && normalizedStock > 0) {
        return false;
      }

      if (inventoryStockFilter === "low_stock") {
        const isLowStock = normalizedStock > 0 && normalizedStock <= normalizedLowStockThreshold;
        if (!isLowStock) {
          return false;
        }
      }

      if (inventoryStockFilter === "in_stock" && normalizedStock <= 0) {
        return false;
      }

      if (inventoryCategoryFilter !== "all" && !(product.categories || []).includes(inventoryCategoryFilter)) {
        return false;
      }

      const isVisible = product.isVisible !== false;
      if (inventoryVisibilityFilter === "visible" && !isVisible) {
        return false;
      }

      if (inventoryVisibilityFilter === "hidden" && isVisible) {
        return false;
      }

      return true;
    });
  }, [
    filteredProducts,
    inventoryStockFilter,
    inventoryCategoryFilter,
    inventoryVisibilityFilter
  ]);

  const reportAlertRows = useMemo(() => {
    const productRows = (lowStockAlerts?.productAlerts || []).map((item) => {
      const stock = Number(item?.stock ?? 0);
      const threshold = Number(item?.lowStockThreshold ?? 10);
      const normalizedStock = Number.isFinite(stock) ? stock : 0;
      const normalizedThreshold = Number.isFinite(threshold) ? threshold : 10;
      const status = normalizedStock <= 0 ? "out" : "low";

      return {
        id: `product-${item.id}`,
        type: "Producto",
        name: item?.name || "Producto sin nombre",
        brand: item?.brand || "Sin marca",
        stock: normalizedStock,
        threshold: normalizedThreshold,
        status,
        productId: item?.id
      };
    });

    const variantRows = (lowStockAlerts?.variantAlerts || []).map((item) => {
      const stock = Number(item?.stock ?? 0);
      const threshold = Number(item?.lowStockThreshold ?? 10);
      const normalizedStock = Number.isFinite(stock) ? stock : 0;
      const normalizedThreshold = Number.isFinite(threshold) ? threshold : 10;
      const status = normalizedStock <= 0 ? "out" : "low";

      return {
        id: `variant-${item.id}`,
        type: "Variante",
        name: `${item?.productName || "Producto"} / ${item?.name || "Variante"}`,
        brand: item?.brand || "Sin marca",
        stock: normalizedStock,
        threshold: normalizedThreshold,
        status,
        productId: item?.productId || null
      };
    });

    return [...productRows, ...variantRows].sort((left, right) => left.stock - right.stock);
  }, [lowStockAlerts]);

  const reportSummary = useMemo(() => {
    const totalAlerts = reportAlertRows.length;
    const outOfStock = reportAlertRows.filter((item) => item.status === "out").length;
    const lowStock = reportAlertRows.filter((item) => item.status === "low").length;
    const productsWithSales = (salesByProduct || []).length;
    const totalUnitsSold = (salesByProduct || []).reduce((sum, item) => sum + Number(item?.unitsSold || 0), 0);

    return {
      totalAlerts,
      outOfStock,
      lowStock,
      productsWithSales,
      totalUnitsSold
    };
  }, [reportAlertRows, salesByProduct]);

  const filteredReportAlertRows = useMemo(() => {
    const term = reportSearch.trim().toLowerCase();

    return reportAlertRows.filter((item) => {
      if (reportAlertStatusFilter === "out" && item.status !== "out") {
        return false;
      }

      if (reportAlertStatusFilter === "low" && item.status !== "low") {
        return false;
      }

      if (reportAlertTypeFilter === "product" && item.type !== "Producto") {
        return false;
      }

      if (reportAlertTypeFilter === "variant" && item.type !== "Variante") {
        return false;
      }

      if (!term) {
        return true;
      }

      const composedSearch = `${item.name} ${item.brand}`.toLowerCase();
      return composedSearch.includes(term);
    });
  }, [reportAlertRows, reportSearch, reportAlertStatusFilter, reportAlertTypeFilter]);

  useEffect(() => {
    if (!editorId) {
      return;
    }

    const latestProduct = products.find((product) => product.id === editorId);
    if (!latestProduct) {
      return;
    }

    setEditorForm(buildEditorForm(latestProduct));
  }, [products, editorId]);

  useEffect(() => {
    if (!isEditorOpen) {
      return;
    }

    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isEditorOpen]);

  useEffect(() => {
    if (!categoriesWithCount.length) {
      if (selectedCategoryName) {
        setSelectedCategoryName("");
      }
      if (selectedCategoryId !== null) {
        setSelectedCategoryId(null);
      }
      return;
    }

    if (selectedCategoryId === null || selectedCategoryId === undefined) {
      return;
    }

    const currentCategory = categoriesWithCount.find((category) => category.id === selectedCategoryId);
    if (!currentCategory) {
      setSelectedCategoryId(null);
      setSelectedCategoryName("");
      setIsEditingCategoryTitle(false);
      setCategoryTitleDraft("");
      return;
    }

    if (currentCategory.name !== selectedCategoryName) {
      setSelectedCategoryName(currentCategory.name);
    }
  }, [categoriesWithCount, selectedCategoryId, selectedCategoryName]);

  useEffect(() => {
    if (selectedCategory) {
      return;
    }

    setIsAddCategoryProductsOpen(false);
    setCategoryProductSearch("");
    setSelectedCategoryProductIds([]);
    setIsSavingCategoryProducts(false);
  }, [selectedCategory]);

  useEffect(() => {
    const validIds = new Set(availableProductsForSelectedCategory.map((product) => product.id));

    setSelectedCategoryProductIds((current) => {
      const next = current.filter((productId) => validIds.has(productId));
      return next.length === current.length ? current : next;
    });
  }, [availableProductsForSelectedCategory]);

  useEffect(() => () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    if (categoryUndoTimeoutRef.current) {
      window.clearTimeout(categoryUndoTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    function handleOutsideMenuClick(event) {
      const target = event.target instanceof Element ? event.target : null;

      if (!target?.closest(".admin-product-menu-wrap")) {
        setOpenProductMenuId(null);
      }
    }

    window.addEventListener("click", handleOutsideMenuClick);
    return () => {
      window.removeEventListener("click", handleOutsideMenuClick);
    };
  }, []);

  function fillForEdit(product) {
    setEditorMode("edit");
    setEditorId(product.id);
    setEditorForm(buildEditorForm(product));
    setEditorVariantForm({
      optionName: "",
      optionValue: "",
      sku: "",
      priceDelta: "0",
      stock: "0",
      lowStockThreshold: "5"
    });
    onLoadVariants?.(product.id);
    setMediaUploadError("");
    setIsSeoOpen(false);
    setIsEditorOpen(true);
  }

  function openCreateEditor() {
    setEditorMode("create");
    setEditorId(null);
    setEditorForm(buildEditorForm(null));
    setEditorVariantForm({
      optionName: "",
      optionValue: "",
      sku: "",
      priceDelta: "0",
      stock: "0",
      lowStockThreshold: "5"
    });
    setMediaUploadError("");
    setIsSeoOpen(false);
    setIsEditorOpen(true);
  }

  function duplicateProduct(product) {
    const duplicateForm = buildEditorForm(product);
    setEditorMode("create");
    setEditorId(null);
    setEditorForm({
      ...duplicateForm,
      name: `${product.name} (copia)`
    });
    setMediaUploadError("");
    setOpenProductMenuId(null);
    setIsSeoOpen(false);
    setIsEditorOpen(true);
  }

  function closeEditor() {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setEditorMode(null);
    setIsEditorOpen(false);
    setEditorId(null);
    setEditorForm(buildEditorForm(null));
    setEditorVariantForm({
      optionName: "",
      optionValue: "",
      sku: "",
      priceDelta: "0",
      stock: "0",
      lowStockThreshold: "5"
    });
    setMediaUploadError("");
  }

  function setEditorField(field, value) {
    setEditorForm((current) => ({ ...current, [field]: value }));
  }

  function setSeoField(field, value) {
    setEditorForm((current) => ({
      ...current,
      seo: {
        ...(current.seo || defaultSeoForm()),
        [field]: value
      }
    }));
  }

  function toggleCategory(categoryName) {
    setEditorForm((current) => {
      const alreadyIn = current.categories.includes(categoryName);
      const nextCategories = alreadyIn
        ? current.categories.filter((item) => item !== categoryName)
        : [...current.categories, categoryName];

      return { ...current, categories: nextCategories };
    });
  }

  function openMediaPicker() {
    mediaInputRef.current?.click();
  }

  async function uploadFiles(files) {
    if (!files.length) return;

    const availableSlots = Math.max(0, MAX_MEDIA_ITEMS - editorForm.media.length);
    if (!availableSlots) {
      setMediaUploadError("Ya cargaste el máximo de 5 imágenes.");
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);
    setMediaUploadError("");
    setIsUploadingMedia(true);

    try {
      const uploadedItems = await onUploadMedia(filesToUpload, editorForm.name);

      setEditorForm((current) => ({
        ...current,
        media: [...current.media, ...(Array.isArray(uploadedItems) ? uploadedItems : [])].slice(0, MAX_MEDIA_ITEMS)
      }));

      if (files.length > availableSlots) {
        setMediaUploadError("Se subieron las primeras imágenes disponibles hasta completar 5.");
      }
    } catch (error) {
      setMediaUploadError(error.message || "No se pudieron subir las imágenes");
    } finally {
      setIsUploadingMedia(false);
    }
  }

  async function handleMediaSelection(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    await uploadFiles(selectedFiles);
  }

  function reorderMedia(fromIndex, toIndex) {
    setEditorForm((current) => {
      const mediaItems = Array.isArray(current.media) ? [...current.media] : [];

      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= mediaItems.length ||
        toIndex >= mediaItems.length ||
        fromIndex === toIndex
      ) {
        return current;
      }

      const [movedItem] = mediaItems.splice(fromIndex, 1);
      mediaItems.splice(toIndex, 0, movedItem);

      return {
        ...current,
        media: mediaItems
      };
    });
    setMediaUploadError("");
  }

  function handleMediaDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const hasFiles = Array.from(event.dataTransfer?.types || []).includes("Files");
    if (hasFiles && !isUploadingMedia && editorForm.media.length < MAX_MEDIA_ITEMS) {
      setIsDraggingOver(true);
    }
  }

  function handleMediaDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  }

  async function handleMediaDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    const droppedFiles = Array.from(event.dataTransfer.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (droppedFiles.length) {
      await uploadFiles(droppedFiles);
    }
  }

  function handleMediaItemDragStart(event, sourceIndex) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(sourceIndex));
    setDraggingMediaIndex(sourceIndex);
    setDropTargetMediaIndex(null);
  }

  function handleMediaItemDragOver(event, targetIndex) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";

    if (draggingMediaIndex !== null && draggingMediaIndex !== targetIndex) {
      setDropTargetMediaIndex(targetIndex);
    }
  }

  function handleMediaItemDragEnd() {
    setDraggingMediaIndex(null);
    setDropTargetMediaIndex(null);
  }

  function handleMediaItemDrop(event, targetIndex) {
    event.preventDefault();
    event.stopPropagation();
    const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
    const finalSourceIndex = Number.isInteger(sourceIndex) ? sourceIndex : draggingMediaIndex;

    if (!Number.isInteger(finalSourceIndex)) {
      handleMediaItemDragEnd();
      return;
    }

    reorderMedia(finalSourceIndex, targetIndex);
    handleMediaItemDragEnd();
  }

  function removeMediaItem(indexToRemove) {
    setEditorForm((current) => ({
      ...current,
      media: current.media.filter((_, index) => index !== indexToRemove)
    }));
    setMediaUploadError("");
  }

  function setMediaAlt(indexToUpdate, value) {
    setEditorForm((current) => ({
      ...current,
      media: current.media.map((item, index) => (
        index === indexToUpdate ? { ...item, alt: value } : item
      ))
    }));
  }

  function applySeoImageAltToAllMedia() {
    const sourceAlt = String(editorForm.seo?.imageAlt || "").trim();

    if (!sourceAlt) {
      return;
    }

    setEditorForm((current) => ({
      ...current,
      media: (Array.isArray(current.media) ? current.media : []).map((item) => (
        item?.type === "video"
          ? item
          : { ...item, alt: sourceAlt }
      ))
    }));
  }

  function setPrimaryMedia(indexToSet) {
    setEditorForm((current) => {
      if (!Array.isArray(current.media) || indexToSet < 0 || indexToSet >= current.media.length) {
        return current;
      }

      if (indexToSet === 0) {
        return current;
      }

      const nextMedia = [...current.media];
      const [selectedItem] = nextMedia.splice(indexToSet, 1);
      nextMedia.unshift(selectedItem);

      return {
        ...current,
        media: nextMedia
      };
    });
    setMediaUploadError("");
  }

  async function handleEditorSubmit(event) {
    event.preventDefault();

    if (editorMode === "edit" && !editorId) {
      return;
    }

    const payload = {
      name: editorForm.name,
      shortDescription: editorForm.shortDescription,
      longDescription: editorForm.longDescription,
      brand: editorForm.brand,
      price: Number(editorForm.price),
      stock: Number(editorForm.stock),
      lowStockThreshold: Number(editorForm.lowStockThreshold || 10),
      isVisible: editorForm.isVisible,
      categories: editorForm.categories,
      media: editorForm.media,
      seo: buildSeoPayload(editorForm.seo || defaultSeoForm())
    };

    try {
      if (editorMode === "create") {
        await onCreate(payload);
      } else {
        await onUpdate(editorId, payload);
      }

      setEditorToast(editorMode === "create" ? "Producto creado correctamente" : "Producto actualizado correctamente");
      setIsToastLeaving(false);

      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = window.setTimeout(() => {
        setIsToastLeaving(true);
      }, 1800);

      window.setTimeout(() => {
        setEditorToast("");
        setIsToastLeaving(false);
      }, 2300);

      closeTimeoutRef.current = window.setTimeout(() => {
        closeEditor();
      }, 900);
    } catch {
      return;
    }
  }

  // orderStatuses and labels are now defined as module-level constants (ORDER_STATUS_LABELS, getOrderStatusFlow)
  const orderFulfillmentOptions = useMemo(() => {
    const values = new Set();

    for (const order of orders) {
      const fulfillmentStatus = deriveFulfillmentBadge(order.status, order.shippingMethod, order.customerAddress);
      if (fulfillmentStatus) {
        values.add(fulfillmentStatus);
      }
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b, "es"));
  }, [orders]);
  const orderProductOptions = useMemo(() => {
    const values = new Set();

    for (const order of orders) {
      for (const line of order.lines || []) {
        const productName = String(line.productName || "").trim();
        if (productName) {
          values.add(productName);
        }
      }
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b, "es"));
  }, [orders]);
  const orderShippingMethodOptions = useMemo(() => {
    const values = new Set();

    for (const order of orders) {
      const shippingMethod = String(order.shippingMethod || "").trim();
      if (shippingMethod) {
        values.add(shippingMethod);
      }
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b, "es"));
  }, [orders]);
  const orderActiveFiltersCount = useMemo(() => {
    let count = 0;

    const hasDateFilter = orderCreatedDateMode !== "all"
      && (orderCreatedDateMode !== "custom" || Boolean(orderCreatedDateFromFilter || orderCreatedDateToFilter));
    if (hasDateFilter) {
      count += 1;
    }

    if (orderFulfillmentFilter !== "all") {
      count += 1;
    }

    if (orderProductFilter.trim()) {
      count += 1;
    }

    if (orderShippingMethodFilter !== "all") {
      count += 1;
    }

    return count;
  }, [
    orderCreatedDateMode,
    orderCreatedDateFromFilter,
    orderCreatedDateToFilter,
    orderFulfillmentFilter,
    orderProductFilter,
    orderShippingMethodFilter
  ]);
  const ordersSummary = useMemo(() => {
    const totalRevenue = orders.reduce((acc, order) => acc + Number(order.total || 0), 0);
    const paidCount = orders.filter((order) => derivePaymentBadge(order.status) === "Pagado").length;
    const withShippingCount = orders.filter((order) => Number(order.shippingCost || 0) > 0).length;

    return {
      count: orders.length,
      totalRevenue,
      paidCount,
      withShippingCount
    };
  }, [orders]);
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderCreatedDateMode === "custom") {
        if (!isOrderInCustomDateRange(order.createdAt, orderCreatedDateFromFilter, orderCreatedDateToFilter)) {
          return false;
        }
      } else if (!isOrderInCreatedDateRange(order.createdAt, orderCreatedDateMode, "")) {
        return false;
      }

      const normalizedProductFilter = orderProductFilter.trim().toLowerCase();

      if (
        orderFulfillmentFilter !== "all"
        && deriveFulfillmentBadge(order.status, order.shippingMethod, order.customerAddress).toLowerCase() !== orderFulfillmentFilter.toLowerCase()
      ) {
        return false;
      }

      if (normalizedProductFilter) {
        const hasProduct = (order.lines || []).some(
          (line) => String(line.productName || "").trim().toLowerCase().includes(normalizedProductFilter)
        );

        if (!hasProduct) {
          return false;
        }
      }

      if (
        orderShippingMethodFilter !== "all"
        && String(order.shippingMethod || "").trim().toLowerCase() !== orderShippingMethodFilter.toLowerCase()
      ) {
        return false;
      }

      return true;
    });
  }, [
    orders,
    orderCreatedDateMode,
    orderCreatedDateFromFilter,
    orderCreatedDateToFilter,
    orderFulfillmentFilter,
    orderProductFilter,
    orderShippingMethodFilter
  ]);
  const visibleOrders = filteredOrders;
  const selectedOrders = useMemo(
    () => visibleOrders.filter((order) => selectedOrderIds.includes(order.id)),
    [visibleOrders, selectedOrderIds]
  );
  const allVisibleOrdersSelected = visibleOrders.length > 0 && selectedOrders.length === visibleOrders.length;
  const isSomeVisibleOrdersSelected = selectedOrders.length > 0 && !allVisibleOrdersSelected;

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  useEffect(() => {
    if (!selectedOrderId) {
      return;
    }

    const stillExists = orders.some((order) => order.id === selectedOrderId);
    if (!stillExists) {
      setSelectedOrderId(null);
    }
  }, [selectedOrderId, orders]);

  useEffect(() => {
    setSelectedOrderIds((current) => {
      const visibleIds = new Set(visibleOrders.map((order) => order.id));
      return current.filter((orderId) => visibleIds.has(orderId));
    });
  }, [visibleOrders]);

  useEffect(() => {
    setIsOrderActionsOpen(false);
    setIsOrderPrintMenuOpen(false);
    setFulfillmentConfirmOrder(null);
    setIsSubmittingFulfillmentConfirm(false);
    setOrderActionMessage("");
  }, [selectedOrderId]);

  useEffect(() => {
    if (!fulfillmentConfirmOrder) {
      return;
    }

    function handleEscapeKey(event) {
      if (event.key === "Escape" && !isSubmittingFulfillmentConfirm) {
        setFulfillmentConfirmOrder(null);
      }
    }

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [fulfillmentConfirmOrder, isSubmittingFulfillmentConfirm]);

  useEffect(() => {
    if (selectedOrders.length > 0) {
      setIsOrderFiltersOpen(false);
      return;
    }

    setIsOrderPrintMenuOpen(false);
  }, [selectedOrders.length]);

  useEffect(() => {
    if (!isOrderActionsOpen) {
      return;
    }

    function handleOutsideClick(event) {
      const target = event.target;
      if (!orderActionsRef.current?.contains(target)) {
        setIsOrderActionsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOrderActionsOpen]);

  useEffect(() => {
    if (!isOrderPrintMenuOpen) {
      return;
    }

    function handleOutsideClick(event) {
      const target = event.target;
      if (!orderPrintMenuRef.current?.contains(target)) {
        setIsOrderPrintMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOrderPrintMenuOpen]);

  async function handleEditorVariantCreate(event) {
    event?.preventDefault?.();

    if (!editorId) {
      return;
    }

    await onCreateVariant(editorId, {
      name: editorVariantForm.optionValue,
      presentation: editorVariantForm.optionName,
      sku: editorVariantForm.sku,
      priceDelta: Number(editorVariantForm.priceDelta),
      stock: Number(editorVariantForm.stock),
      lowStockThreshold: Number(editorVariantForm.lowStockThreshold)
    });

    setEditorVariantForm({
      optionName: editorVariantForm.optionName,
      optionValue: "",
      sku: "",
      priceDelta: "0",
      stock: "0",
      lowStockThreshold: "5"
    });
  }

  function handleStartEditShippingRule(rule) {
    setEditingShippingRuleId(rule.id);
    setEditingShippingRuleForm({
      baseCost: String(rule.baseCost ?? 0),
      freeShippingFrom: String(rule.freeShippingFrom ?? 0),
      etaMinDays: String(rule.etaMinDays ?? 1),
      etaMaxDays: String(rule.etaMaxDays ?? 1)
    });
  }

  function handleCancelEditShippingRule() {
    setEditingShippingRuleId(null);
    setEditingShippingRuleForm({
      baseCost: "",
      freeShippingFrom: "",
      etaMinDays: "",
      etaMaxDays: ""
    });
  }

  async function handleSaveShippingRule(rule) {
    const nextBaseCost = Number(editingShippingRuleForm.baseCost);
    const nextFreeShippingFrom = Number(editingShippingRuleForm.freeShippingFrom);
    const nextEtaMinDays = Number(editingShippingRuleForm.etaMinDays);
    const nextEtaMaxDays = Number(editingShippingRuleForm.etaMaxDays);

    if (
      !Number.isFinite(nextBaseCost)
      || !Number.isFinite(nextFreeShippingFrom)
      || !Number.isInteger(nextEtaMinDays)
      || !Number.isInteger(nextEtaMaxDays)
      || nextBaseCost < 0
      || nextFreeShippingFrom < 0
      || nextEtaMinDays <= 0
      || nextEtaMaxDays < nextEtaMinDays
    ) {
      return;
    }

    await onUpdateShippingRule(rule.id, {
      zone: rule.zone,
      baseCost: nextBaseCost,
      freeShippingFrom: nextFreeShippingFrom,
      etaMinDays: nextEtaMinDays,
      etaMaxDays: nextEtaMaxDays,
      isActive: rule.isActive
    });

    handleCancelEditShippingRule();
  }

  async function handlePromotionCreate(event) {
    event.preventDefault();
    await onCreatePromotion({
      code: promoForm.code,
      name: promoForm.name,
      type: promoForm.type,
      value: Number(promoForm.value),
      minSubtotal: promoForm.minSubtotal ? Number(promoForm.minSubtotal) : null
    });
    setPromoForm({ code: "", name: "", type: "percent", value: "0", minSubtotal: "" });
  }

  function openOrderDetail(orderId) {
    setSelectedOrderId(orderId);
  }

  function closeOrderDetail() {
    setSelectedOrderId(null);
  }

  function handleOrderSelectionChange(orderId, isChecked) {
    setSelectedOrderIds((current) => {
      if (isChecked) {
        if (current.includes(orderId)) {
          return current;
        }

        return [...current, orderId];
      }

      return current.filter((id) => id !== orderId);
    });
  }

  function handleVisibleOrdersSelectionChange(isChecked) {
    if (!isChecked) {
      setSelectedOrderIds([]);
      return;
    }

    setSelectedOrderIds(visibleOrders.map((order) => order.id));
  }

  async function handleMarkSelectedOrdersFulfilled() {
    if (!selectedOrders.length) {
      return;
    }

    for (const order of selectedOrders) {
      await onOrderStatusChange(order.id, "entregado");
    }

    setSelectedOrderIds([]);
  }

  async function ensureOrderInvoiceMeta(order) {
    if (!order) {
      return null;
    }

    if (typeof onEnsureOrderInvoice === "function") {
      return onEnsureOrderInvoice(order.id);
    }

    return null;
  }

  async function openOrderInvoice(order, popup = null) {
    if (!order) {
      return null;
    }

    const invoiceMeta = await ensureOrderInvoiceMeta(order);
    return openPrintableOrderDocument(order, "invoice", invoiceMeta, popup);
  }

  async function printOrderInvoice(order) {
    if (!order) {
      return;
    }

    const pendingPopup = openPendingInvoiceWindow();

    try {
      const popup = await openOrderInvoice(order, pendingPopup);
      if (popup && !popup.closed) {
        popup.focus();
        popup.print();
      }
    } catch (error) {
      if (pendingPopup && !pendingPopup.closed) {
        pendingPopup.close();
      }

      throw error;
    }
  }

  async function downloadOrderInvoicePdf(order) {
    if (!order) {
      return;
    }

    const invoiceMeta = await ensureOrderInvoiceMeta(order);
    await downloadOrderDocumentAsPdf(order, "invoice", invoiceMeta);
  }

  async function handlePrintSelectedOrders() {
    if (!selectedOrders.length) {
      return;
    }

    for (const order of selectedOrders) {
      await printOrderInvoice(order);
    }

    setIsOrderPrintMenuOpen(false);
  }

  async function handleDownloadSelectedOrdersPdf() {
    if (!selectedOrders.length) {
      return;
    }

    for (const order of selectedOrders) {
      await downloadOrderInvoicePdf(order);
    }

    setIsOrderPrintMenuOpen(false);
  }

  async function handleOrderQuickAction(actionKey, order) {
    if (!order) {
      return;
    }

    const orderNumber = order.wixOrderNumber || order.id;

    function isStorePickupOrder(targetOrder) {
      const normalized = [
        targetOrder?.shippingMethod,
        targetOrder?.shippingZone,
        targetOrder?.deliveryTime,
        targetOrder?.customerAddress
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .join(" ");

      return (
        normalized.includes("pickup")
        || normalized.includes("retiro")
        || normalized.includes("retirar")
        || normalized.includes("tienda")
        || normalized.includes("local")
        || normalized.includes("sucursal")
      );
    }

    function openReadyForPickupEmailPreview(targetOrder) {
      if (typeof window === "undefined") {
        return false;
      }

      const popup = window.open("", "_blank", "width=980,height=860,scrollbars=yes,resizable=yes");
      if (!popup) {
        setOrderActionMessage("No se pudo abrir la previsualización. Revisá el bloqueador de ventanas.");
        return false;
      }

      const targetOrderNumber = String(targetOrder.wixOrderNumber || targetOrder.id || "-");
      const orderDate = (() => {
        const parsed = new Date(targetOrder.createdAt || Date.now());
        if (Number.isNaN(parsed.getTime())) {
          return "-";
        }

        return parsed.toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
      })();

      const currency = String(targetOrder.currency || "ARS").toUpperCase();
      const lines = Array.isArray(targetOrder.lines) ? targetOrder.lines : [];
      const itemsSubtotal = lines.reduce((acc, line) => acc + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0);
      const shippingCost = Number(targetOrder.shippingCost || 0);
      const taxTotal = Number(targetOrder.taxTotal || 0);
      const orderTotal = Number(targetOrder.total || 0) > 0
        ? Number(targetOrder.total || 0)
        : Math.max(0, itemsSubtotal + shippingCost + taxTotal - Number(targetOrder.discount || 0));

      const formatMoney = (value) => Number(value || 0).toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      const pickupAddress = "Acevedo 200, C1414, Ciudad Autónoma de Buenos Aires, Argentina";
      const pickupInstructions = hasValue(targetOrder.deliveryTime)
        ? targetOrder.deliveryTime
        : "Lunes a viernes de 9:00 a 17:00. Traé tu número de pedido y DNI.";

      const lineRows = lines
        .map((line, index) => {
          const quantity = Number(line.quantity || 0);
          const unitPrice = Number(line.unitPrice || 0);
          const lineTotal = quantity * unitPrice;
          const imageUrl = resolveOrderLineImageUrl(line, products);

          return `
            <tr>
              <td>
                <div class="item-grid">
                  <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(line.productName || "Producto")}" class="item-image" />
                  <div>
                    <strong>Producto n.° ${index + 1}</strong>
                    <p>${escapeHtml(line.productName || "Producto")}</p>
                    <p>Tamaño: ${escapeHtml(line.variant || "-")}</p>
                    <p>Precio: ${escapeHtml(`${formatMoney(unitPrice)} ${currency}`)}</p>
                  </div>
                </div>
              </td>
              <td>Cant.: ${quantity}</td>
              <td>${escapeHtml(`${formatMoney(lineTotal)} ${currency}`)}</td>
            </tr>
          `;
        })
        .join("");

      const html = `
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Previsualización email retiro en local</title>
            <style>
              * { box-sizing: border-box; }
              body {
                margin: 0;
                background: #08123a;
                font-family: "Segoe UI", Arial, sans-serif;
                color: #111827;
              }
              .preview-shell {
                min-height: 100vh;
                padding: 28px 16px;
                display: grid;
                place-items: center;
              }
              .email-card {
                width: min(760px, 100%);
                background: #ffffff;
                border: 1px solid #d7deea;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.28);
                padding: 26px;
              }
              .email-brand {
                margin: 0 0 18px;
                text-align: center;
                font-size: 1.15rem;
                letter-spacing: 0.18em;
                text-transform: uppercase;
              }
              .email-title {
                margin: 0 0 12px;
                text-align: center;
                font-size: 2rem;
                font-weight: 400;
              }
              .email-lead {
                margin: 0 0 4px;
                text-align: center;
                font-size: 1.22rem;
              }
              .email-body {
                margin: 0;
                text-align: center;
                line-height: 1.45;
              }
              .meta-grid {
                margin-top: 18px;
                border-top: 1px solid #d1d5db;
                border-bottom: 1px solid #d1d5db;
                padding: 10px 0;
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
                font-size: 0.9rem;
              }
              .pickup-grid {
                margin-top: 10px;
                border-bottom: 1px solid #d1d5db;
                padding-bottom: 10px;
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
              }
              .pickup-grid h4 {
                margin: 0 0 6px;
                font-size: 0.88rem;
                color: #4b5563;
              }
              .pickup-grid p {
                margin: 0;
                font-size: 0.9rem;
                line-height: 1.34;
              }
              .items-title {
                margin: 14px 0 8px;
                font-size: 0.92rem;
              }
              .items-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.9rem;
              }
              .items-table td {
                border-bottom: 1px solid #dfe4ee;
                padding: 10px 0;
                vertical-align: top;
              }
              .items-table td:nth-child(2),
              .items-table td:nth-child(3) {
                white-space: nowrap;
                text-align: right;
                padding-left: 10px;
              }
              .item-grid {
                display: grid;
                grid-template-columns: 58px minmax(0, 1fr);
                gap: 10px;
                align-items: start;
              }
              .item-grid p {
                margin: 0;
                line-height: 1.25;
              }
              .item-image {
                width: 58px;
                height: 58px;
                object-fit: cover;
                border: 1px solid #d7deea;
                background: #f3f4f6;
              }
              .totals {
                margin-top: 10px;
                margin-left: auto;
                width: min(100%, 240px);
                font-size: 0.9rem;
              }
              .totals-row {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                padding: 3px 0;
              }
              .totals-row.is-total {
                margin-top: 6px;
                padding-top: 6px;
                border-top: 1px solid #d1d5db;
                font-weight: 700;
              }
              .email-footer {
                margin-top: 14px;
                border-top: 1px solid #d1d5db;
                padding-top: 12px;
                font-size: 0.88rem;
                line-height: 1.35;
              }
              .email-footer p { margin: 0 0 8px; }
              .email-link { color: #3456d8; text-decoration: underline; }
              @media (max-width: 640px) {
                .email-card { padding: 16px; }
                .email-title { font-size: 1.6rem; }
                .meta-grid,
                .pickup-grid { grid-template-columns: 1fr; }
              }
            </style>
          </head>
          <body>
            <div class="preview-shell">
              <main class="email-card">
                <h1 class="email-brand">La Boutique de la Limpieza®</h1>
                <h2 class="email-title">Tu pedido está disponible para ser recogido.</h2>
                <p class="email-lead">Los artículos de tu pedido están listos para ser recogidos.</p>
                <p class="email-body">Puedes encontrar los detalles de recogida a continuación.</p>

                <section class="meta-grid">
                  <p>Pedido n.° ${escapeHtml(targetOrderNumber)}</p>
                  <p>Realizado el ${escapeHtml(orderDate)}</p>
                </section>

                <section class="pickup-grid">
                  <article>
                    <h4>Dirección donde retirar el pedido</h4>
                    <p>${escapeHtml(pickupAddress)}</p>
                  </article>
                  <article>
                    <h4>Instrucciones para retirar</h4>
                    <p>${escapeHtml(pickupInstructions)}</p>
                  </article>
                </section>

                <h3 class="items-title">Elementos en el pedido</h3>
                <table class="items-table" aria-label="Elementos del pedido para retirar">
                  <tbody>
                    ${lineRows || '<tr><td colspan="3">No hay elementos en este pedido.</td></tr>'}
                  </tbody>
                </table>

                <section class="totals">
                  <div class="totals-row"><span>Subtotal</span><span>${escapeHtml(`${formatMoney(itemsSubtotal)} ${currency}`)}</span></div>
                  <div class="totals-row"><span>Envío</span><span>${escapeHtml(`${formatMoney(shippingCost)} ${currency}`)}</span></div>
                  <div class="totals-row"><span>Impuestos</span><span>${escapeHtml(`${formatMoney(taxTotal)} ${currency}`)}</span></div>
                  <div class="totals-row is-total"><span>Total</span><span>${escapeHtml(`${formatMoney(orderTotal)} ${currency}`)}</span></div>
                </section>

                <footer class="email-footer">
                  <p><strong>¿Necesitás asistencia?</strong> Contactanos</p>
                  <p>Llámanos: 011 15 5501-8399<br />Escríbenos un email: laboutiqueacevedo200@gmail.com</p>
                  <p>Este email fue enviado por La Boutique de la Limpieza®</p>
                  <p><a class="email-link" href="https://www.laboutiquedelalimpieza.com.ar/" target="_blank" rel="noreferrer">https://www.laboutiquedelalimpieza.com.ar/</a></p>
                </footer>
              </main>
            </div>
          </body>
        </html>
      `;

      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.focus();

      return true;
    }

    function openReadyForPickupEmailDraft(targetOrder) {
      const email = String(targetOrder?.contactEmail || "").trim();
      if (!email) {
        setOrderActionMessage("Este pedido no tiene email de contacto.");
        return false;
      }

      const targetOrderNumber = targetOrder.wixOrderNumber || targetOrder.id;
      const subject = encodeURIComponent(`Pedido listo para retirar · Pedido #${targetOrderNumber}`);
      const body = encodeURIComponent(
        `Hola ${targetOrder.customerName || ""},%0D%0A%0D%0A` +
        `Tu pedido #${targetOrderNumber} ya está listo para ser retirado.%0D%0A` +
        `Si tenés dudas, podés responder este email.%0D%0A%0D%0A` +
        "Gracias por tu compra."
      );

      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      return true;
    }

    async function handleConfirmFulfillment() {
      if (!fulfillmentConfirmOrder) {
        return;
      }

      const targetOrder = fulfillmentConfirmOrder;
      const targetOrderNumber = targetOrder.wixOrderNumber || targetOrder.id;

      setIsSubmittingFulfillmentConfirm(true);

      try {
        await onOrderStatusChange(targetOrder.id, "entregado");

        if (fulfillmentConfirmMarkPaid) {
          await onOrderStatusChange(targetOrder.id, "pago");
        }

        let emailDraftOpened = false;
        if (fulfillmentConfirmSendReadyEmail) {
          emailDraftOpened = openReadyForPickupEmailDraft(targetOrder);
        }

        const messageParts = [`Pedido #${targetOrderNumber} marcado como cumplido.`];
        if (fulfillmentConfirmMarkPaid) {
          messageParts.push("También se marcó como pagado.");
        }
        if (fulfillmentConfirmSendReadyEmail) {
          messageParts.push(emailDraftOpened
            ? "Se abrió el email de pedido listo para retirar."
            : "No se pudo abrir el email porque el pedido no tiene contacto.");
        }

        setOrderActionMessage(messageParts.join(" "));
        setFulfillmentConfirmOrder(null);
        setIsOrderActionsOpen(false);
      } catch (error) {
        setOrderActionMessage(error?.message || "No se pudo marcar el pedido como cumplido.");
      } finally {
        setIsSubmittingFulfillmentConfirm(false);
      }
    }

    if (actionKey === "preview_ready_email") {
      if (isStorePickupOrder(order)) {
        openReadyForPickupEmailPreview(order);
        return;
      }

      openReadyForPickupEmailDraft(order);
      return;
    }

    if (actionKey === "mark_completed") {
      setFulfillmentConfirmOrder(order);
      setFulfillmentConfirmMarkPaid(false);
      setFulfillmentConfirmSendReadyEmail(false);
      setIsOrderActionsOpen(false);
      return;
    }

    if (actionKey === "confirm_mark_completed") {
      await handleConfirmFulfillment();
      return;
    }

    if (actionKey === "mark_unprocessed") {
      await onOrderStatusChange(order.id, "nuevo");
      setOrderActionMessage(`Pedido #${orderNumber} marcado como no procesado.`);
      setIsOrderActionsOpen(false);
      return;
    }

    if (actionKey === "cancel_order") {
      await onOrderStatusChange(order.id, "cancelado");
      setOrderActionMessage(`Pedido #${orderNumber} cancelado.`);
      setIsOrderActionsOpen(false);
      return;
    }

    if (actionKey === "verify_payment") {
      if (!onVerifyPayment) return;
      setIsVerifyingPayment(true);
      setPaymentVerification(null);
      try {
        const result = await onVerifyPayment(order.id);
        if (result) {
          setPaymentVerification(result);
          setOrderActionMessage(
            result.verified
              ? `Pago verificado: ${result.mpStatus} — $${result.mpAmount ?? "?"} (${result.amountMatch ? "monto coincide" : "⚠️ MONTO NO COINCIDE"})`
              : result.message || "No se encontraron pagos para este pedido"
          );
        }
      } catch (err) {
        setOrderActionMessage(err?.message || "Error al verificar pago");
      } finally {
        setIsVerifyingPayment(false);
        setIsOrderActionsOpen(false);
      }
      return;
    }

    if (actionKey === "cancel_and_refund") {
      await onOrderStatusChange(order.id, "cancelado");
      setOrderActionMessage(`Pedido #${orderNumber} cancelado. Iniciá el reembolso desde la opción "Reembolsar".`);
      setIsOrderActionsOpen(false);
      return;
    }

    if (actionKey === "send_shipping_email") {
      const email = String(order.contactEmail || "").trim();
      if (!email) {
        setOrderActionMessage("Este pedido no tiene email de contacto.");
        return;
      }

      const subject = encodeURIComponent(`Confirmación de envío · Pedido #${orderNumber}`);
      const body = encodeURIComponent(
        `Hola ${order.customerName || ""},%0D%0A%0D%0ATu pedido #${orderNumber} está listo para envío.%0D%0A` +
        `Método: ${order.shippingMethod || "-"}%0D%0A` +
        `Seguimiento: ${order.trackingNumber || "(sin número aún)"}%0D%0A%0D%0AGracias por tu compra.`
      );

      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      setOrderActionMessage("Se abrió tu cliente de correo con el email prearmado.");
      setIsOrderActionsOpen(false);
      return;
    }

    if (actionKey === "print") {
      try {
        await printOrderInvoice(order);
      } catch (error) {
        setOrderActionMessage(error?.message || "No se pudo abrir la impresión del pedido.");
        setIsOrderActionsOpen(false);
        return;
      }

      setOrderActionMessage("Se abrió el diálogo de impresión.");
      setIsOrderActionsOpen(false);
      return;
    }

    if (actionKey === "download_pdf") {
      try {
        await downloadOrderInvoicePdf(order);
      } catch (error) {
        setOrderActionMessage(error?.message || "No se pudo descargar el PDF.");
        setIsOrderActionsOpen(false);
        return;
      }

      setOrderActionMessage("PDF descargado correctamente.");
      setIsOrderActionsOpen(false);
      return;
    }

    if (actionKey === "invoice") {
      const pendingPopup = openPendingInvoiceWindow();

      try {
        await openOrderInvoice(order, pendingPopup);
        setOrderActionMessage("Factura generada en una pestaña nueva.");
      } catch (error) {
        if (pendingPopup && !pendingPopup.closed) {
          pendingPopup.close();
        }

        setOrderActionMessage(error?.message || "No se pudo generar la factura.");
      }

      setIsOrderActionsOpen(false);
      return;
    }

    if (actionKey === "receipt") {
      openPrintableOrderDocument(order, "receipt");
      setOrderActionMessage("Recibo generado en una pestaña nueva.");
      setIsOrderActionsOpen(false);
      return;
    }

    setOrderActionMessage("Esta acción aún no está disponible en este sistema.");
    setIsOrderActionsOpen(false);
  }

  async function handlePromotionTest(event) {
    event.preventDefault();
    const result = await onApplyPromotion(promoTest.code, Number(promoTest.subtotal), []);
    setPromoTestResult(result);
  }

  async function handleCreateCategory(event) {
    event.preventDefault();

    const normalizedName = categoryName.trim();
    if (!normalizedName) {
      return;
    }

    await onCreateCategory(normalizedName);
    setCategoryName("");
    setCategorySearch("");
    setIsCategoryCreateOpen(false);
    setSelectedCategoryName(normalizedName);
  }

  function handleInventoryDraftChange(productId, value) {
    if (!/^\d*$/.test(value)) {
      return;
    }

    setInventoryDraftById((current) => ({
      ...current,
      [productId]: value
    }));

    setInventoryErrorsById((current) => {
      if (!current[productId]) {
        return current;
      }

      const next = { ...current };
      delete next[productId];
      return next;
    });
  }

  function formatPriceDisplay(value) {
    const num = String(value).replace(/\./g, "");
    if (!num) return "";
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function handleInventoryPriceDraftChange(productId, value) {
    const raw = value.replace(/\./g, "");
    if (raw !== "" && !/^\d+$/.test(raw)) {
      return;
    }

    setInventoryPriceDraftById((current) => ({
      ...current,
      [productId]: raw
    }));

    setInventoryErrorsById((current) => {
      if (!current[productId]) {
        return current;
      }

      const next = { ...current };
      delete next[productId];
      return next;
    });
  }

  function buildInventoryPayload(product, nextStock, nextPrice) {
    return {
      name: product.name || "",
      shortDescription: product.shortDescription || "",
      longDescription: product.longDescription || "",
      brand: product.brand || "",
      price: nextPrice,
      stock: nextStock,
      lowStockThreshold: Number(product.lowStockThreshold ?? 10),
      isVisible: product.isVisible !== false,
      categories: Array.isArray(product.categories) ? product.categories : [],
      media: Array.isArray(product.media) ? product.media : [],
      seo: product.seo && typeof product.seo === "object"
        ? {
          metaTitle: String(product.seo.metaTitle || ""),
          metaDescription: String(product.seo.metaDescription || ""),
          imageAlt: String(product.seo.imageAlt || ""),
          slug: String(product.seo.slug || ""),
          canonicalUrl: String(product.seo.canonicalUrl || ""),
          focusKeyword: String(product.seo.focusKeyword || ""),
          keywords: Array.isArray(product.seo.keywords) ? product.seo.keywords : [],
          ogTitle: String(product.seo.ogTitle || ""),
          ogDescription: String(product.seo.ogDescription || ""),
          twitterTitle: String(product.seo.twitterTitle || ""),
          twitterDescription: String(product.seo.twitterDescription || "")
        }
        : {
          metaTitle: "",
          metaDescription: "",
          imageAlt: "",
          slug: "",
          canonicalUrl: "",
          focusKeyword: "",
          keywords: [],
          ogTitle: "",
          ogDescription: "",
          twitterTitle: "",
          twitterDescription: ""
        }
    };
  }

  async function handleInventorySave(product, overrides) {
    const draftValue = overrides?.stock ?? inventoryDraftById[product.id];
    const normalizedDraft = typeof draftValue === "string" && draftValue !== ""
      ? draftValue
      : String(product.stock ?? 0);

    const nextStock = Number(normalizedDraft);

    if (!Number.isInteger(nextStock) || nextStock < 0) {
      setInventoryErrorsById((current) => ({
        ...current,
        [product.id]: "Ingresá un inventario válido (entero mayor o igual a 0)."
      }));
      return;
    }

    const priceDraftValue = overrides?.price ?? inventoryPriceDraftById[product.id];
    const normalizedPriceDraft = typeof priceDraftValue === "string" && priceDraftValue !== ""
      ? priceDraftValue
      : String(product.price ?? 0);

    const nextPrice = Number(normalizedPriceDraft);

    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      setInventoryErrorsById((current) => ({
        ...current,
        [product.id]: "Ingresá un precio válido (mayor o igual a 0)."
      }));
      return;
    }

    const stockChanged = nextStock !== Number(product.stock ?? 0);
    const priceChanged = nextPrice !== Number(product.price ?? 0);

    if (!stockChanged && !priceChanged) {
      return;
    }

    setInventorySavingById((current) => ({ ...current, [product.id]: true }));
    setInventoryErrorsById((current) => {
      if (!current[product.id]) {
        return current;
      }

      const next = { ...current };
      delete next[product.id];
      return next;
    });

    try {
      await onUpdate(product.id, buildInventoryPayload(product, nextStock, nextPrice));
      setInventoryDraftById((current) => ({
        ...current,
        [product.id]: String(nextStock)
      }));
      setInventoryPriceDraftById((current) => ({
        ...current,
        [product.id]: String(nextPrice)
      }));
    } catch (error) {
      setInventoryErrorsById((current) => ({
        ...current,
        [product.id]: error.message || "No se pudo actualizar el inventario"
      }));
    } finally {
      setInventorySavingById((current) => {
        const next = { ...current };
        delete next[product.id];
        return next;
      });
    }
  }

  function handleInventoryToggleSelect(productId) {
    setInventorySelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  function handleInventoryToggleAll() {
    setInventorySelectedIds((current) => {
      if (current.size === filteredInventoryProducts.length && filteredInventoryProducts.length > 0) {
        return new Set();
      }
      return new Set(filteredInventoryProducts.map((p) => p.id));
    });
  }

  async function handleInventoryBulkSave() {
    const bulkPrice = bulkPriceValue.trim();
    const bulkStock = bulkStockValue.trim();

    const validBulkPrice = bulkPrice && /^\d+$/.test(bulkPrice) && Number(bulkPrice) >= 0;
    const validBulkStock = bulkStock && /^\d+$/.test(bulkStock) && Number.isInteger(Number(bulkStock)) && Number(bulkStock) >= 0;

    if (validBulkPrice) {
      setInventoryPriceDraftById((current) => {
        const next = { ...current };
        for (const productId of inventorySelectedIds) {
          next[productId] = bulkPrice;
        }
        return next;
      });
    }

    if (validBulkStock) {
      setInventoryDraftById((current) => {
        const next = { ...current };
        for (const productId of inventorySelectedIds) {
          next[productId] = bulkStock;
        }
        return next;
      });
    }

    const overrides = {};
    if (validBulkPrice) overrides.price = bulkPrice;
    if (validBulkStock) overrides.stock = bulkStock;

    const selectedProducts = filteredInventoryProducts.filter((p) => inventorySelectedIds.has(p.id));

    setInventoryBulkSaving(true);

    for (const product of selectedProducts) {
      await handleInventorySave(product, overrides);
    }

    setInventoryBulkSaving(false);
    setInventorySelectedIds(new Set());
    setBulkPriceValue("");
    setBulkStockValue("");
  }

  function getProductPrimaryImage(product) {
    if (!Array.isArray(product?.media)) {
      return "/fotos/foto-inicio.webp";
    }

    const firstMedia = product.media.find((item) => item && typeof item === "object" && item.url);
    return firstMedia?.url || "/fotos/foto-inicio.webp";
  }

  function handleViewCategoryProducts(category) {
    setSelectedCategoryId(category.id);
    setSelectedCategoryName(category.name);
    setIsEditingCategoryTitle(false);
    setCategoryTitleDraft(category.name);
    setIsAddCategoryProductsOpen(false);
    setCategoryProductSearch("");
    setSelectedCategoryProductIds([]);
    setIsSavingCategoryProducts(false);
  }

  function handleBackToCategories() {
    setSelectedCategoryId(null);
    setSelectedCategoryName("");
    setIsEditingCategoryTitle(false);
    setCategoryTitleDraft("");
    setIsAddCategoryProductsOpen(false);
    setCategoryProductSearch("");
    setSelectedCategoryProductIds([]);
    setIsSavingCategoryProducts(false);
  }

  function handleStartCategoryTitleEdit() {
    if (!selectedCategory) {
      return;
    }

    setCategoryTitleDraft(selectedCategory.name);
    setIsEditingCategoryTitle(true);
  }

  function handleCancelCategoryTitleEdit() {
    setCategoryTitleDraft(selectedCategory?.name || "");
    setIsEditingCategoryTitle(false);
  }

  function clearCategoryUndoTimeout() {
    if (!categoryUndoTimeoutRef.current) {
      return;
    }

    window.clearTimeout(categoryUndoTimeoutRef.current);
    categoryUndoTimeoutRef.current = null;
  }

  async function handleSaveCategoryTitle() {
    if (!selectedCategory || !onUpdateCategory) {
      return;
    }

    const nextName = categoryTitleDraft.trim();
    if (!nextName) {
      return;
    }

    if (normalizeCategoryName(nextName) === normalizeCategoryName(selectedCategory.name)) {
      setIsEditingCategoryTitle(false);
      return;
    }

    setIsSavingCategoryTitle(true);
    try {
      await onUpdateCategory(selectedCategory.id, nextName);
      setSelectedCategoryName(nextName);
      setIsEditingCategoryTitle(false);
    } finally {
      setIsSavingCategoryTitle(false);
    }
  }

  async function handleRemoveProductFromSelectedCategory(product) {
    if (!selectedCategoryName || !onUpdate) {
      return;
    }

    const originalCategories = getProductCategoryNames(product);
    const normalizedSelectedCategory = normalizeCategoryName(selectedCategoryName);
    const nextCategories = originalCategories.filter(
      (categoryName) => normalizeCategoryName(categoryName) !== normalizedSelectedCategory
    );

    if (nextCategories.length === originalCategories.length) {
      return;
    }

    if (!window.confirm(`¿Quitar "${product.name}" de la categoría "${selectedCategoryName}"?`)) {
      return;
    }

    setRemovingCategoryProductId(product.id);
    try {
      await onUpdate(product.id, {
        ...buildInventoryPayload(product, Number(product.stock ?? 0)),
        categories: nextCategories
      });

      clearCategoryUndoTimeout();
      setCategoryRemovalUndo({
        productId: product.id,
        productName: product.name,
        removedCategoryName: selectedCategoryName,
        previousCategories: originalCategories
      });

      categoryUndoTimeoutRef.current = window.setTimeout(() => {
        setCategoryRemovalUndo(null);
        categoryUndoTimeoutRef.current = null;
      }, 5000);
    } finally {
      setRemovingCategoryProductId(null);
    }
  }

  function handleToggleCategoryProductSelection(productId) {
    setSelectedCategoryProductIds((current) => (
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    ));
  }

  async function handleSaveCategoryProductsSelection() {
    if (!selectedCategoryName || !onUpdate || !selectedCategoryProductIds.length) {
      return;
    }

    const normalizedSelectedCategory = normalizeCategoryName(selectedCategoryName);

    setIsSavingCategoryProducts(true);
    try {
      for (const productId of selectedCategoryProductIds) {
        const product = products.find((item) => item.id === productId);
        if (!product) {
          continue;
        }

        const originalCategories = getProductCategoryNames(product);
        const alreadyInCategory = originalCategories.some(
          (categoryName) => normalizeCategoryName(categoryName) === normalizedSelectedCategory
        );

        if (alreadyInCategory) {
          continue;
        }

        await onUpdate(product.id, {
          ...buildInventoryPayload(product, Number(product.stock ?? 0)),
          categories: [...originalCategories, selectedCategoryName]
        });
      }

      setSelectedCategoryProductIds([]);
      setIsAddCategoryProductsOpen(false);
      setCategoryProductSearch("");
    } finally {
      setIsSavingCategoryProducts(false);
    }
  }

  async function handleUndoCategoryRemoval() {
    if (!categoryRemovalUndo || !onUpdate) {
      return;
    }

    const latestProduct = products.find((product) => product.id === categoryRemovalUndo.productId);
    if (!latestProduct) {
      setCategoryRemovalUndo(null);
      clearCategoryUndoTimeout();
      return;
    }

    setRemovingCategoryProductId(latestProduct.id);
    try {
      await onUpdate(latestProduct.id, {
        ...buildInventoryPayload(latestProduct, Number(latestProduct.stock ?? 0)),
        categories: categoryRemovalUndo.previousCategories
      });
      setCategoryRemovalUndo(null);
      clearCategoryUndoTimeout();
    } finally {
      setRemovingCategoryProductId(null);
    }
  }

  const hasProductListFilters =
    adminProductSearch.trim().length > 0 ||
    productStockFilter !== "all" ||
    productCategoryFilter !== "all" ||
    productVisibilityFilter !== "all";

  const hasInventoryListFilters =
    adminProductSearch.trim().length > 0 ||
    inventoryStockFilter !== "all" ||
    inventoryCategoryFilter !== "all" ||
    inventoryVisibilityFilter !== "all";

  const sectionTitle =
    activeSection === "Productos"
      ? `Productos (${filteredCatalogProducts.length}${hasProductListFilters ? ` de ${products.length}` : ""})`
      : activeSection === "Inventario"
        ? `Inventario (${filteredInventoryProducts.length}${hasInventoryListFilters ? ` de ${products.length}` : ""})`
        : activeSection;

  const analyticsSummary = analytics?.summary || {};
  const analyticsComparison = analytics?.comparison || {};
  const analyticsCharts = analytics?.charts || {};
  const analyticsBreakdown = analytics?.breakdown || {};
  const analyticsRecentEvents = Array.isArray(analytics?.recentEvents) ? analytics.recentEvents : [];
  const analyticsDaily = Array.isArray(analyticsCharts.daily) ? analyticsCharts.daily : [];
  const analyticsHourly = Array.isArray(analyticsCharts.hourly) ? analyticsCharts.hourly : [];
  const analyticsWeekdayHeatmap = Array.isArray(analyticsCharts.weekdayHeatmap) ? analyticsCharts.weekdayHeatmap : [];

  const maxDailyPageViews = analyticsDaily.reduce((max, item) => Math.max(max, Number(item.pageViews || 0)), 0);
  const maxHourlyPageViews = analyticsHourly.reduce((max, item) => Math.max(max, Number(item.pageViews || 0)), 0);
  const maxHeatmapPageViews = analyticsWeekdayHeatmap.reduce((max, item) => Math.max(max, Number(item.pageViews || 0)), 0);
  const analyticsDailySessionsSeries = analyticsDaily.map((item) => Number(item.sessions || 0));
  const analyticsDailyVisitorsSeries = analyticsDaily.map((item) => Number(item.uniqueVisitors || 0));
  const analyticsDailyClicksSeries = analyticsDaily.map((item) => Number(item.clicks || 0));
  const totalSessionsForFallback = Math.max(Number(analyticsSummary.sessions || 0), 120);
  const sourcePerformance = Array.isArray(analyticsBreakdown.sourcePerformance) ? analyticsBreakdown.sourcePerformance : [];

  const rawDevicesBreakdown = Array.isArray(analyticsBreakdown.devices) ? analyticsBreakdown.devices : [];
  const devicesBreakdown = (rawDevicesBreakdown.length >= 2
    ? rawDevicesBreakdown
    : [
      {
        device: "desktop",
        sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.52))
      },
      {
        device: "mobile",
        sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.39))
      },
      {
        device: "tablet",
        sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.09))
      }
    ]).map((item) => ({
      ...item,
      label: formatAnalyticsDeviceLabel(item.device)
    }));
  const rawBrowsersBreakdown = Array.isArray(analyticsBreakdown.browsers) ? analyticsBreakdown.browsers : [];
  const browsersBreakdown = (rawBrowsersBreakdown.length >= 3
    ? rawBrowsersBreakdown
    : [
      { browser: "chrome", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.46)) },
      { browser: "safari", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.24)) },
      { browser: "edge", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.18)) },
      { browser: "firefox", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.12)) }
    ]).map((item) => ({
    ...item,
    label: formatAnalyticsBrowserLabel(item.browser)
  }));
  const rawOperatingSystemsBreakdown = Array.isArray(analyticsBreakdown.operatingSystems) ? analyticsBreakdown.operatingSystems : [];
  const operatingSystemsBreakdown = (rawOperatingSystemsBreakdown.length >= 3
    ? rawOperatingSystemsBreakdown
    : [
      { os: "windows", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.47)) },
      { os: "android", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.31)) },
      { os: "ios", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.15)) },
      { os: "macos", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.07)) }
    ]).map((item) => ({
    ...item,
    label: formatAnalyticsOperatingSystemLabel(item.os)
  }));
  const rawTopSearchTerms = Array.isArray(analyticsBreakdown.topSearchTerms) ? analyticsBreakdown.topSearchTerms : [];
  const rawTopSelectedCategories = Array.isArray(analyticsBreakdown.topSelectedCategories) ? analyticsBreakdown.topSelectedCategories : [];
  const topSearchTermsBreakdown = rawTopSearchTerms.length
    ? rawTopSearchTerms
    : [
      { term: "detergente", searches: 38 },
      { term: "lavandina", searches: 26 },
      { term: "desengrasante", searches: 19 }
    ];
  const topSelectedCategoriesBreakdown = rawTopSelectedCategories.length
    ? rawTopSelectedCategories
    : [
      { category: "Limpieza de cocina", selections: 34 },
      { category: "Baño y desinfección", selections: 23 },
      { category: "Lavandería", selections: 15 }
    ];
  const devicesTotal = devicesBreakdown.reduce((sum, item) => sum + Number(item.sessions || 0), 0);
  const browsersTotal = browsersBreakdown.reduce((sum, item) => sum + Number(item.sessions || 0), 0);
  const operatingSystemsTotal = operatingSystemsBreakdown.reduce((sum, item) => sum + Number(item.sessions || 0), 0);
  const deviceChartColors = [
    "var(--blue)",
    "rgba(24, 119, 242, 0.65)",
    "rgba(24, 119, 242, 0.48)",
    "rgba(24, 119, 242, 0.32)"
  ];
  const deviceChartGradient = buildAnalyticsDonutGradient(devicesBreakdown, devicesTotal, deviceChartColors);
  const browsersChartGradient = buildAnalyticsDonutGradient(browsersBreakdown, browsersTotal, deviceChartColors);
  const operatingSystemsChartGradient = buildAnalyticsDonutGradient(operatingSystemsBreakdown, operatingSystemsTotal, deviceChartColors);
  const rawTopMediums = Array.isArray(analyticsBreakdown.topMediums) ? analyticsBreakdown.topMediums : [];
  const rawTopCampaigns = Array.isArray(analyticsBreakdown.topCampaigns) ? analyticsBreakdown.topCampaigns : [];
  const topMediums = rawTopMediums.length
    ? rawTopMediums
    : [
      { medium: "paid_social", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.36)) },
      { medium: "cpc", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.29)) },
      { medium: "organic", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.22)) }
    ];
  const topCampaigns = rawTopCampaigns.length
    ? rawTopCampaigns
    : [
      { campaign: "meta-trafico-lanzamiento", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.28)) },
      { campaign: "google-search-limpieza", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.21)) },
      { campaign: "remarketing-febrero", sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.14)) }
    ];
  const sourceFallbacks = {
    direct: { sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.55)), deltaPct: 165 },
    organic: { sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.3)), deltaPct: -18 },
    instagram: { sessions: Math.max(1, Math.round(totalSessionsForFallback * 0.15)), deltaPct: 100 }
  };

  const buildSourceBucket = (key, label, matcher) => {
    let sessions = 0;
    let weightedDelta = 0;
    let deltaItems = 0;
    let deltaAccumulator = 0;

    sourcePerformance.forEach((item) => {
      if (!matcher(item)) {
        return;
      }

      const itemSessions = Number(item.sessions || 0);
      const itemDelta = Number(item.deltaPct || 0);

      sessions += itemSessions;
      weightedDelta += itemDelta * Math.max(itemSessions, 1);
      deltaAccumulator += itemDelta;
      deltaItems += 1;
    });

    if (sessions <= 0) {
      const fallback = sourceFallbacks[key];
      return {
        key,
        source: key,
        channel: "",
        sessions: fallback.sessions,
        deltaPct: fallback.deltaPct,
        displayLabel: label
      };
    }

    return {
      key,
      source: key,
      channel: "",
      sessions,
      deltaPct: sessions > 0 ? weightedDelta / sessions : (deltaItems ? deltaAccumulator / deltaItems : 0),
      displayLabel: label
    };
  };

  const featuredTrafficSources = [
    buildSourceBucket(
      "direct",
      "Directa",
      (item) => {
        const source = String(item?.source || "").toLowerCase();
        const channel = String(item?.channel || "").toLowerCase();
        return !source || source === "direct" || source === "directo" || source === "(direct)" || channel === "direct" || channel === "directo";
      }
    ),
    buildSourceBucket(
      "organic",
      "Orgánica",
      (item) => {
        const source = String(item?.source || "").toLowerCase();
        const channel = String(item?.channel || "").toLowerCase();
        return (channel === "organic" || channel === "orgánico") && source !== "instagram";
      }
    ),
    buildSourceBucket(
      "instagram",
      "Instagram",
      (item) => String(item?.source || "").toLowerCase() === "instagram"
    )
  ];
  const maxSourceSessions = featuredTrafficSources.reduce((max, item) => Math.max(max, Number(item.sessions || 0)), 0);
  const sessionsSparklinePoints = buildSparklinePoints(analyticsDailySessionsSeries);
  const visitorsSparklinePoints = buildSparklinePoints(analyticsDailyVisitorsSeries);
  const clicksSparklinePoints = buildSparklinePoints(analyticsDailyClicksSeries);
  const timelineCoordinates = buildLineCoordinates(analyticsDailySessionsSeries, 620, 220);
  const timelinePolyline = timelineCoordinates.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const timelineAreaPath = timelineCoordinates.length
    ? `M ${timelineCoordinates.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" L ")} L 620 220 L 0 220 Z`
    : "";
  const timelineStartLabel = analyticsDaily[0]?.day ? formatAnalyticsDay(analyticsDaily[0].day) : "-";
  const timelineMiddleLabel = analyticsDaily[Math.floor((analyticsDaily.length - 1) / 2)]?.day
    ? formatAnalyticsDay(analyticsDaily[Math.floor((analyticsDaily.length - 1) / 2)].day)
    : "-";
  const timelineEndLabel = analyticsDaily.length
    ? formatAnalyticsDay(analyticsDaily[analyticsDaily.length - 1].day)
    : "-";
  const analyticsHeatmapMap = useMemo(() => {
    const map = new Map();

    for (const point of analyticsWeekdayHeatmap) {
      map.set(`${point.weekday}-${point.hour}`, Number(point.pageViews || 0));
    }

    return map;
  }, [analyticsWeekdayHeatmap]);

  async function handleAnalyticsReload(periodOrRange = analyticsPeriod) {
    if (!onReloadAnalytics) {
      return;
    }

    setIsReloadingAnalytics(true);
    try {
      if (periodOrRange && typeof periodOrRange === "object" && periodOrRange.from) {
        await onReloadAnalytics({ from: periodOrRange.from, to: periodOrRange.to });
      } else {
        await onReloadAnalytics(periodOrRange);
      }
    } finally {
      setIsReloadingAnalytics(false);
    }
  }

  function generateMockUserSessions() {
    const mockUsers = [
      { id: 1, name: "María García", email: "maria.garcia@gmail.com" },
      { id: 2, name: "Carlos López", email: "carlos.lopez@hotmail.com" },
      { id: 3, name: "Ana Rodríguez", email: "ana.rodriguez@yahoo.com" },
      { id: 4, name: "Juan Martínez", email: "jmartinez@outlook.com" },
      { id: 5, name: "Laura Fernández", email: "laura.f@gmail.com" },
    ];
    const devices = ["mobile", "desktop", "tablet"];
    const browsers = ["Chrome", "Safari", "Firefox", "Edge"];
    const oses = ["Windows", "iOS", "Android", "macOS"];
    const sources = ["google", "instagram", "directo", "facebook", "whatsapp"];
    const products = [
      { id: 101, name: "Lavandina Ayudín x5L", brand: "Ayudín", price: 2850 },
      { id: 102, name: "Limpiador Multiuso Mr Músculo", brand: "Mr Músculo", price: 3200 },
      { id: 103, name: "Jabón en Polvo Skip 3kg", brand: "Skip", price: 5400 },
      { id: 104, name: "Suavizante Vivere 900ml", brand: "Vivere", price: 2100 },
      { id: 105, name: "Desodorante Ambiente Glade", brand: "Glade", price: 1750 },
      { id: 106, name: "Esponja Scotch-Brite x3", brand: "Scotch-Brite", price: 1200 },
      { id: 107, name: "Detergente Magistral 750ml", brand: "Magistral", price: 2400 },
      { id: 108, name: "Limpia Pisos Procenex", brand: "Procenex", price: 1900 },
    ];
    const categories = ["Limpieza del Hogar", "Lavandería", "Cocina", "Baño", "Aromatizantes", "Ofertas Destacadas"];
    const searches = ["lavandina", "detergente", "esponja", "desinfectante", "jabon", "limpiador", "trapo piso"];

    const now = new Date();
    const sessions = [];

    for (let i = 0; i < 25; i++) {
      const isLoggedIn = i < 8;
      const user = isLoggedIn ? mockUsers[i % mockUsers.length] : null;
      const device = devices[i % devices.length];
      const sessionStart = new Date(now.getTime() - (i * 3600000 + Math.floor(Math.random() * 7200000)));
      const durationSec = 30 + Math.floor(Math.random() * 900);
      const sessionEnd = new Date(sessionStart.getTime() + durationSec * 1000);
      const sid = `demo-sid-${1000 + i}`;

      const timeline = [];
      let t = new Date(sessionStart);

      timeline.push({ eventType: "page_view", path: "/", at: t.toISOString(), metadata: { activeSection: "home" } });
      t = new Date(t.getTime() + 5000 + Math.floor(Math.random() * 15000));

      if (Math.random() > 0.3) {
        const cat = categories[Math.floor(Math.random() * categories.length)];
        timeline.push({ eventType: "category_select", path: "/", at: t.toISOString(), metadata: { categoryName: cat } });
        t = new Date(t.getTime() + 3000 + Math.floor(Math.random() * 10000));
      }

      if (Math.random() > 0.4) {
        const s = searches[Math.floor(Math.random() * searches.length)];
        timeline.push({ eventType: "search", path: "/", at: t.toISOString(), metadata: { query: s, queryLength: s.length } });
        t = new Date(t.getTime() + 2000 + Math.floor(Math.random() * 8000));
      }

      const viewedProducts = [];
      const numProductViews = 1 + Math.floor(Math.random() * 4);
      for (let p = 0; p < numProductViews; p++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        viewedProducts.push(prod);
        timeline.push({ eventType: "product_view", path: "/", at: t.toISOString(), metadata: { productId: prod.id, productName: prod.name, productBrand: prod.brand, productPrice: prod.price } });
        t = new Date(t.getTime() + 4000 + Math.floor(Math.random() * 20000));
      }

      const cartAdds = [];
      if (Math.random() > 0.35) {
        const numAdds = 1 + Math.floor(Math.random() * 3);
        for (let c = 0; c < numAdds && c < viewedProducts.length; c++) {
          const prod = viewedProducts[c];
          const qty = 1 + Math.floor(Math.random() * 3);
          cartAdds.push(prod);
          timeline.push({ eventType: "add_to_cart", path: "/", at: t.toISOString(), metadata: { productId: prod.id, productName: prod.name, quantity: qty, unitPrice: prod.price } });
          t = new Date(t.getTime() + 2000 + Math.floor(Math.random() * 5000));
        }
      }

      let didCheckout = false;
      if (cartAdds.length > 0 && Math.random() > 0.5) {
        didCheckout = true;
        timeline.push({ eventType: "begin_checkout", path: "/", at: t.toISOString(), metadata: { cartItems: cartAdds.length } });
        t = new Date(t.getTime() + 5000);
      }

      if (isLoggedIn && i === 0) {
        timeline.splice(1, 0, { eventType: "login", path: "/", at: new Date(sessionStart.getTime() + 3000).toISOString(), metadata: { method: "email" } });
      }

      sessions.push({
        sessionId: sid,
        visitorId: `demo-vid-${2000 + (isLoggedIn ? user.id : 100 + i)}`,
        userId: user ? user.id : null,
        userName: user ? user.name : null,
        userEmail: user ? user.email : null,
        isLoggedIn,
        deviceType: device,
        browserName: browsers[i % browsers.length],
        osName: oses[i % oses.length],
        source: sources[i % sources.length],
        sessionStart: sessionStart.toISOString(),
        sessionEnd: sessionEnd.toISOString(),
        durationSeconds: durationSec,
        totalEvents: timeline.length,
        pageViews: timeline.filter((e) => e.eventType === "page_view").length,
        cartAdds: timeline.filter((e) => e.eventType === "add_to_cart").length,
        productViews: timeline.filter((e) => e.eventType === "product_view").length,
        searches: timeline.filter((e) => e.eventType === "search").length,
        checkouts: didCheckout ? 1 : 0,
        categorySelects: timeline.filter((e) => e.eventType === "category_select").length,
        otherClicks: 0,
        timeline
      });
    }

    const loggedInSessions = sessions.filter((s) => s.isLoggedIn).length;
    return {
      range: { from: new Date(now.getTime() - 30 * 86400000).toISOString(), to: now.toISOString() },
      summary: {
        totalSessions: sessions.length,
        loggedInSessions,
        anonymousSessions: sessions.length - loggedInSessions,
        avgDurationSeconds: sessions.reduce((s, x) => s + x.durationSeconds, 0) / sessions.length,
        totalCartAdds: sessions.reduce((s, x) => s + x.cartAdds, 0),
        totalProductViews: sessions.reduce((s, x) => s + x.productViews, 0),
        totalCheckouts: sessions.reduce((s, x) => s + x.checkouts, 0)
      },
      sessions
    };
  }

  async function handleOpenUserActivity() {
    setIsUserActivityOpen(true);
    setIsUserActivityLoading(true);
    try {
      const periodOrRange = analyticsDateRange || analyticsPeriod || "30d";
      const data = await onFetchUserSessions(periodOrRange);
      const hasRealSessions = Array.isArray(data?.sessions) && data.sessions.length > 0;
      setUserActivityData(hasRealSessions ? data : generateMockUserSessions());
    } catch {
      setUserActivityData(generateMockUserSessions());
    } finally {
      setIsUserActivityLoading(false);
    }
  }

  async function handleRefreshUserActivity() {
    setIsUserActivityLoading(true);
    try {
      const periodOrRange = analyticsDateRange || analyticsPeriod || "30d";
      const data = await onFetchUserSessions(periodOrRange);
      const hasRealSessions = Array.isArray(data?.sessions) && data.sessions.length > 0;
      setUserActivityData(hasRealSessions ? data : generateMockUserSessions());
    } catch {
      setUserActivityData(generateMockUserSessions());
    } finally {
      setIsUserActivityLoading(false);
    }
  }

  useEffect(() => {
    if (activeSection !== "Analíticas") {
      return;
    }

    if (!onReloadAnalytics || analytics) {
      return;
    }

    handleAnalyticsReload(analyticsPeriod).catch(() => {});
  }, [activeSection, analytics, onReloadAnalytics, analyticsPeriod]);

  useEffect(() => {
    if (!isUserActivityFilterOpen) return;
    function handleClickOutside(e) {
      if (userActivityFilterRef.current && !userActivityFilterRef.current.contains(e.target)) {
        setIsUserActivityFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserActivityFilterOpen]);

  useEffect(() => {
    const targetOrderId = Number(orderNavigationRequest?.orderId);

    if (!Number.isInteger(targetOrderId) || targetOrderId <= 0) {
      return;
    }

    setActiveSection("Pedidos");
    setSelectedOrderId(targetOrderId);

    if (orderNavigationRequest?.intent !== "invoice") {
      return;
    }

    const targetOrder = (Array.isArray(orders) ? orders : []).find((order) => Number(order?.id) === targetOrderId);
    if (!targetOrder) {
      setOrderActionMessage("No se encontró el pedido para abrir la factura.");
      return;
    }

    const pendingPopup = openPendingInvoiceWindow();

    openOrderInvoice(targetOrder, pendingPopup)
      .then(() => {
        setOrderActionMessage("Factura generada en una pestaña nueva.");
      })
      .catch((error) => {
        if (pendingPopup && !pendingPopup.closed) {
          pendingPopup.close();
        }
        setOrderActionMessage(error?.message || "No se pudo generar la factura.");
      });
  }, [orderNavigationRequest, orders]);

  return (
    <section className="admin-panel" aria-label="Panel de administración">
      <aside className="admin-sidebar" aria-label="Secciones de administración">
        <div className="admin-sidebar-header">
          <h3>Admin</h3>
          <div className="admin-notification-bell-wrapper">
            <button
              type="button"
              className="admin-notification-bell"
              onClick={() => setIsNotificationPanelOpen((prev) => !prev)}
              aria-label={`Notificaciones${unreadNotificationsCount > 0 ? ` (${unreadNotificationsCount} sin leer)` : ""}`}
            >
              🔔
              {unreadNotificationsCount > 0 && (
                <span className="admin-notification-badge">{unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}</span>
              )}
            </button>

            {isNotificationPanelOpen && (
              <div className="admin-notification-dropdown">
                <div className="admin-notification-dropdown-header">
                  <strong>Notificaciones</strong>
                  {unreadNotificationsCount > 0 && (
                    <button
                      type="button"
                      className="admin-notification-mark-all"
                      onClick={() => {
                        if (onMarkAllNotificationsRead) onMarkAllNotificationsRead();
                        setIsNotificationPanelOpen(false);
                      }}
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                </div>
                <ul className="admin-notification-list">
                  {notifications.length === 0 ? (
                    <li className="admin-notification-empty">Sin notificaciones</li>
                  ) : (
                    notifications.slice(0, 30).map((n) => (
                      <li
                        key={n.id}
                        className={`admin-notification-item ${n.isRead ? "" : "is-unread"}`}
                        onClick={() => {
                          if (!n.isRead && onMarkNotificationRead) onMarkNotificationRead(n.id);
                          const matchedOrder = orders.find((o) => o.id === n.orderId);
                          if (matchedOrder) {
                            setActiveSection("Pedidos");
                          }
                          setIsNotificationPanelOpen(false);
                        }}
                      >
                        <span className="admin-notification-icon">
                          {n.eventType === "ORDER_CREATED" ? "🛒" :
                           n.eventType === "PAYMENT_APPROVED" ? "✅" :
                           n.eventType === "ORDER_CONFIRMED" ? "📋" :
                           n.eventType === "ORDER_PROCESSING" ? "⚙️" :
                           n.eventType === "ORDER_READY_FOR_PICKUP" ? "🏪" :
                           n.eventType === "ORDER_SHIPPED" ? "🚚" :
                           n.eventType === "ORDER_DELIVERED" ? "🎉" :
                           n.eventType === "PAYMENT_FAILED" ? "⚠️" : "🔔"}
                        </span>
                        <div className="admin-notification-content">
                          <p className="admin-notification-message">{n.message}</p>
                          <span className="admin-notification-time">
                            {new Date(n.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
        <ul>
          {sections.map((section) => (
            <li key={section}>
              <button
                type="button"
                className={`admin-sidebar-item ${activeSection === section ? "is-active" : ""}`}
                onClick={() => setActiveSection(section)}
              >
                <span className="admin-sidebar-icon" aria-hidden="true">{sectionIcons[section] || "•"}</span>
                <span>{section}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="admin-content">
        <h2>{sectionTitle}</h2>
        {editorToast && <div className={`admin-editor-toast ${isToastLeaving ? "is-leaving" : ""}`}>{editorToast}</div>}

        {activeSection === "Productos" ? (
          <>
            {isEditorOpen && (
              <form className="admin-product-editor" onSubmit={handleEditorSubmit} ref={editorRef}>
                <header className="admin-product-editor-header">
                  <div>
                    {editorMode === "create" ? (
                      <>
                        <h3>Nuevo producto</h3>
                        <p>Completá los datos para crear el producto.</p>
                      </>
                    ) : (
                      <>
                        <p className="admin-product-editor-subtitle">Editar producto</p>
                        <h3 className="admin-product-editor-title">{editorProduct?.name || "Producto sin nombre"}</h3>
                      </>
                    )}
                  </div>
                  <div className="admin-product-editor-header-actions">
                    <button type="submit">
                      <span className="admin-btn-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 3H13L16 6V17H4V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 3V8H13V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 13H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <span>Guardar cambios</span>
                    </button>
                    <button type="button" className="secondary-btn" onClick={closeEditor}>
                      <span className="admin-btn-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 5L3 10L8 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M4 10H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <span>Volver al listado</span>
                    </button>
                  </div>
                </header>

                <div className="admin-product-editor-grid">
                  <section className="admin-editor-card admin-editor-priority-card">
                    <h4>Inventario y visibilidad</h4>
                    <div className="admin-editor-fields admin-editor-inline-fields">
                      <label className="admin-editor-field">
                        <span>Precio ($)</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Ej: $1900"
                          value={editorForm.price}
                          onChange={(event) => setEditorField("price", event.target.value)}
                          required
                        />
                      </label>
                      <label className="admin-editor-field">
                        <span>Inventario</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="Ej: 80"
                          value={editorForm.stock}
                          onChange={(event) => setEditorField("stock", event.target.value)}
                          required
                        />
                      </label>
                    </div>
                    <label className="admin-visibility-toggle">
                      <input
                        type="checkbox"
                        checked={editorForm.isVisible}
                        onChange={(event) => setEditorField("isVisible", event.target.checked)}
                      />
                      <span>Mostrar en la tienda online</span>
                    </label>
                  </section>

                  <section className="admin-editor-card admin-media-card">
                    <div className="admin-media-header-row">
                      <h4>Imágenes y videos</h4>
                      <p className="admin-media-count">{editorForm.media.length}/{MAX_MEDIA_ITEMS} imágenes</p>
                    </div>
                    {editorForm.media.length > 1 && (
                      <p className="admin-media-reorder-hint">Arrastrá y soltá para reordenar la galería.</p>
                    )}

                    <input
                      ref={mediaInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMediaSelection}
                      hidden
                    />

                    {mediaUploadError && <p className="admin-media-error">{mediaUploadError}</p>}

                    <div
                      className={`admin-media-gallery${isDraggingOver ? " is-drag-over" : ""}`}
                      onDragOver={handleMediaDragOver}
                      onDragLeave={handleMediaDragLeave}
                      onDrop={handleMediaDrop}
                    >
                      {editorForm.media.map((item, index) => (
                        <article
                          key={`${item.url}-${index}`}
                          className={`admin-media-tile ${index === 0 ? "is-primary" : ""} ${editorForm.media.length > 1 ? "is-draggable" : ""} ${draggingMediaIndex === index ? "is-dragging" : ""} ${dropTargetMediaIndex === index ? "is-drop-target" : ""}`}
                          draggable={editorForm.media.length > 1 && !isUploadingMedia}
                          onDragStart={(event) => handleMediaItemDragStart(event, index)}
                          onDragEnd={handleMediaItemDragEnd}
                          onDragOver={(event) => handleMediaItemDragOver(event, index)}
                          onDrop={(event) => handleMediaItemDrop(event, index)}
                        >
                          <div className="admin-media-preview-wrap">
                            {item.type === "video" ? (
                              <div className="admin-media-thumb admin-media-thumb-video">Video</div>
                            ) : (
                              <img
                                className="admin-media-thumb"
                                src={item.url}
                                alt={item.alt || `Media ${index + 1}`}
                                loading="lazy"
                              />
                            )}
                            {index === 0 && <span className="admin-media-primary">Principal</span>}
                            {index > 0 && <span className="admin-media-order">{index + 1}</span>}
                          </div>

                          <div className="admin-media-tile-body">
                            <input
                              type="text"
                              placeholder="Alt SEO de la imagen"
                              value={item.alt || ""}
                              onChange={(event) => setMediaAlt(index, event.target.value)}
                            />
                            <small className="admin-editor-help">
                              Describí exactamente la foto (producto, aroma, tamaño y marca). Evitá repetir solo keywords.
                            </small>
                            <div className="admin-media-tile-actions">
                              {index !== 0 && (
                                <button
                                  type="button"
                                  className="secondary-btn"
                                  onClick={() => setPrimaryMedia(index)}
                                >
                                  Principal
                                </button>
                              )}
                              <button
                                type="button"
                                className="danger-btn"
                                onClick={() => removeMediaItem(index)}
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}

                      {editorForm.media.length < MAX_MEDIA_ITEMS && (
                        <button
                          type="button"
                          className="admin-media-add-tile"
                          onClick={openMediaPicker}
                          disabled={isUploadingMedia}
                        >
                          <span className="admin-media-add-plus">+</span>
                          <span>{isUploadingMedia ? "Subiendo..." : "Agregar foto"}</span>
                        </button>
                      )}
                    </div>

                    {!editorForm.media.length && (
                      <p className="admin-media-empty">Cargá imágenes para mostrar la galería del producto.</p>
                    )}
                  </section>

                  <section className="admin-editor-card">
                    <h4>Información del producto</h4>
                    <div className="admin-editor-fields">
                      <label className="admin-editor-field">
                        <span>Nombre</span>
                        <input
                          type="text"
                          placeholder="Ej: Pastilla para lavarropas IO Clean"
                          value={editorForm.name}
                          onChange={(event) => setEditorField("name", event.target.value)}
                          required
                        />
                      </label>
                      <label className="admin-editor-field">
                        <span>Marca</span>
                        <input
                          type="text"
                          placeholder="Ej: IO Clean"
                          value={editorForm.brand}
                          onChange={(event) => setEditorField("brand", event.target.value)}
                        />
                      </label>
                      <label className="admin-editor-field">
                        <span>Descripción corta</span>
                        <textarea
                          rows={2}
                          placeholder="Resumen breve para catálogo"
                          value={editorForm.shortDescription}
                          onChange={(event) => setEditorField("shortDescription", event.target.value)}
                        />
                      </label>
                      <label className="admin-editor-field">
                        <span>Descripción larga</span>
                        <textarea
                          rows={6}
                          placeholder="Detalle completo del producto"
                          value={editorForm.longDescription}
                          onChange={(event) => setEditorField("longDescription", event.target.value)}
                        />
                      </label>
                    </div>
                  </section>

                  <section className="admin-editor-card">
                    <h4>Categorías</h4>
                    <div className="admin-categories-grid">
                      {categoryOptions.map((categoryName) => (
                        <label key={categoryName} className="admin-category-option">
                          <input
                            type="checkbox"
                            checked={editorForm.categories.includes(categoryName)}
                            onChange={() => toggleCategory(categoryName)}
                          />
                          <span>{categoryName}</span>
                        </label>
                      ))}
                    </div>
                  </section>

                  {editorMode === "edit" && editorId && (
                    <section className="admin-editor-card admin-editor-options-card">
                      <h4>Opciones del producto</h4>
                      <div className="admin-editor-options-form">
                        <input
                          type="text"
                          placeholder="Opción (ej: Color)"
                          value={editorVariantForm.optionName}
                          onChange={(event) => setEditorVariantForm((current) => ({ ...current, optionName: event.target.value }))}
                        />
                        <input
                          type="text"
                          placeholder="Valor (ej: Negro)"
                          value={editorVariantForm.optionValue}
                          onChange={(event) => setEditorVariantForm((current) => ({ ...current, optionValue: event.target.value }))}
                        />
                        <button type="button" onClick={handleEditorVariantCreate}>Agregar opción</button>
                      </div>

                      <div className="admin-editor-options-list">
                        <h5>Variantes guardadas</h5>
                        {editorVariants.length ? (
                          <ul>
                            {editorVariants.map((variant) => (
                              <li key={variant.id}>
                                <button
                                  type="button"
                                  className="admin-option-remove-btn"
                                  onClick={() => onDeleteVariant(editorId, variant.id)}
                                  aria-label={`Eliminar opción ${variant.presentation || "Opción"}: ${variant.name}`}
                                  title="Eliminar"
                                >
                                  ×
                                </button>
                                <span>
                                  <strong>{variant.presentation || "Opción"}:</strong> {variant.name}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>Todavía no agregaste opciones para este producto.</p>
                        )}
                      </div>
                    </section>
                  )}

                  <section className="admin-editor-card admin-seo-card">
                    <button
                      type="button"
                      className="admin-seo-toggle"
                      onClick={() => setIsSeoOpen((current) => !current)}
                      aria-expanded={isSeoOpen}
                    >
                      <span className="admin-seo-toggle-title">SEO del producto</span>
                      <span className={`admin-seo-toggle-arrow ${isSeoOpen ? "is-open" : ""}`} aria-hidden="true">▾</span>
                    </button>
                    {isSeoOpen && (
                    <div className="admin-editor-fields">
                      <label className="admin-editor-field">
                        <span>Meta título</span>
                        <input
                          type="text"
                          placeholder="Meta título"
                          value={editorForm.seo?.metaTitle || ""}
                          onChange={(event) => setSeoField("metaTitle", event.target.value)}
                        />
                        <small className="admin-editor-help">Usá nombre del producto + beneficio + marca. Ideal entre 50 y 60 caracteres.</small>
                      </label>
                      <label className="admin-editor-field">
                        <span>Meta descripción</span>
                        <textarea
                          rows={2}
                          placeholder="Meta descripción"
                          value={editorForm.seo?.metaDescription || ""}
                          onChange={(event) => setSeoField("metaDescription", event.target.value)}
                        />
                        <small className="admin-editor-help">Resumen persuasivo con palabra clave principal y ventaja comercial. Ideal 140-160 caracteres.</small>
                      </label>
                      <label className="admin-editor-field">
                        <span>Palabra clave principal</span>
                        <input
                          type="text"
                          placeholder="Palabra clave principal"
                          value={editorForm.seo?.focusKeyword || ""}
                          onChange={(event) => setSeoField("focusKeyword", event.target.value)}
                        />
                        <small className="admin-editor-help">Debe ser la búsqueda exacta del cliente, por ejemplo: detergente líquido limón 750ml.</small>
                      </label>
                      <label className="admin-editor-field">
                        <span>Keywords</span>
                        <input
                          type="text"
                          placeholder="Keywords (separadas por coma)"
                          value={editorForm.seo?.keywordsText || ""}
                          onChange={(event) => setSeoField("keywordsText", event.target.value)}
                        />
                        <small className="admin-editor-help">Agregá variaciones reales y sinónimos separados por coma; evitá repetir lo mismo muchas veces.</small>
                      </label>
                      <label className="admin-editor-field">
                        <span>ALT principal (fallback)</span>
                        <input
                          type="text"
                          placeholder="Texto alternativo por defecto para imágenes"
                          value={editorForm.seo?.imageAlt || ""}
                          onChange={(event) => setSeoField("imageAlt", event.target.value)}
                        />
                        <small className="admin-editor-help">Se usa cuando una imagen no tiene ALT propio. Describí producto, presentación y beneficio en lenguaje natural.</small>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={applySeoImageAltToAllMedia}
                          disabled={!String(editorForm.seo?.imageAlt || "").trim() || !editorForm.media.length}
                        >
                          Copiar ALT principal a todas las fotos
                        </button>
                      </label>
                      <label className="admin-editor-field">
                        <span>Slug</span>
                        <input
                          type="text"
                          placeholder="Slug (ej: detergente-liquido-limon-750ml)"
                          value={editorForm.seo?.slug || ""}
                          onChange={(event) => setSeoField("slug", event.target.value)}
                        />
                        <small className="admin-editor-help">URL corta, en minúsculas, sin tildes y con guiones. Incluí la keyword principal.</small>
                      </label>
                      <label className="admin-editor-field">
                        <span>Canonical URL</span>
                        <input
                          type="url"
                          placeholder="Canonical URL"
                          value={editorForm.seo?.canonicalUrl || ""}
                          onChange={(event) => setSeoField("canonicalUrl", event.target.value)}
                        />
                        <small className="admin-editor-help">Pegá la URL definitiva del producto para evitar contenido duplicado entre páginas similares.</small>
                      </label>
                      <label className="admin-editor-field">
                        <span>Open Graph título</span>
                        <input
                          type="text"
                          placeholder="Open Graph título"
                          value={editorForm.seo?.ogTitle || ""}
                          onChange={(event) => setSeoField("ogTitle", event.target.value)}
                        />
                        <small className="admin-editor-help">Título para compartir en WhatsApp/Facebook. Hacelo más vendedor que el título SEO.</small>
                      </label>
                      <label className="admin-editor-field">
                        <span>Open Graph descripción</span>
                        <textarea
                          rows={2}
                          placeholder="Open Graph descripción"
                          value={editorForm.seo?.ogDescription || ""}
                          onChange={(event) => setSeoField("ogDescription", event.target.value)}
                        />
                        <small className="admin-editor-help">Texto corto para redes: destacá beneficio, precio o promo para mejorar clics.</small>
                      </label>
                      <label className="admin-editor-field">
                        <span>Twitter título</span>
                        <input
                          type="text"
                          placeholder="Twitter título"
                          value={editorForm.seo?.twitterTitle || ""}
                          onChange={(event) => setSeoField("twitterTitle", event.target.value)}
                        />
                        <small className="admin-editor-help">Mensaje breve y directo para Twitter/X; priorizá claridad y gancho comercial.</small>
                      </label>
                      <label className="admin-editor-field">
                        <span>Twitter descripción</span>
                        <textarea
                          rows={2}
                          placeholder="Twitter descripción"
                          value={editorForm.seo?.twitterDescription || ""}
                          onChange={(event) => setSeoField("twitterDescription", event.target.value)}
                        />
                        <small className="admin-editor-help">Complementá el título con detalle útil: uso, presentación, marca o envío.</small>
                      </label>
                    </div>
                    )}
                  </section>
                </div>

                <footer className="admin-product-editor-actions">
                  <button type="button" className="secondary-btn" onClick={closeEditor}>
                    Volver al listado
                  </button>
                </footer>
              </form>
            )}

            {!isEditorOpen && (
              <>
                <div className="admin-form-actions admin-products-actions admin-products-toolbar admin-products-toolbar-with-filters">
                  <div className="admin-products-toolbar-row">
                    <input
                      type="search"
                      className="admin-products-search"
                      placeholder="Buscar por producto o marca"
                      value={adminProductSearch}
                      onChange={(event) => setAdminProductSearch(event.target.value)}
                      aria-label="Buscar productos"
                    />
                    <div className="admin-products-toolbar-actions">
                      <button
                        type="button"
                        className="admin-inventory-filter-btn"
                        onClick={() => setIsProductFiltersOpen((current) => !current)}
                        aria-expanded={isProductFiltersOpen}
                      >
                        Filtros {productActiveFiltersCount > 0 ? `(${productActiveFiltersCount})` : ""}
                      </button>
                      <button type="button" className="admin-new-product-btn" onClick={openCreateEditor}>
                        <span className="admin-new-product-btn-icon" aria-hidden="true">+</span>
                        <span>Nuevo producto</span>
                      </button>
                    </div>
                  </div>

                  {isProductFiltersOpen && (
                    <div className="admin-inventory-filters-panel">
                      <label className="admin-inventory-filter-field">
                        <span>Estado de stock</span>
                        <select
                          value={productStockFilter}
                          onChange={(event) => setProductStockFilter(event.target.value)}
                        >
                          <option value="all">Todos</option>
                          <option value="out_of_stock">Sin stock</option>
                          <option value="low_stock">Stock bajo</option>
                          <option value="in_stock">Con stock</option>
                        </select>
                      </label>

                      <label className="admin-inventory-filter-field">
                        <span>Categoría</span>
                        <select
                          value={productCategoryFilter}
                          onChange={(event) => setProductCategoryFilter(event.target.value)}
                        >
                          <option value="all">Todas</option>
                          {inventoryCategoryOptions.map((categoryName) => (
                            <option key={`product-category-${categoryName}`} value={categoryName}>
                              {categoryName}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="admin-inventory-filter-field">
                        <span>Visibilidad</span>
                        <select
                          value={productVisibilityFilter}
                          onChange={(event) => setProductVisibilityFilter(event.target.value)}
                        >
                          <option value="all">Todos</option>
                          <option value="visible">Visible</option>
                          <option value="hidden">Oculto</option>
                        </select>
                      </label>

                      <button
                        type="button"
                        className="admin-inventory-clear-filters-btn"
                        onClick={() => {
                          setProductStockFilter("all");
                          setProductCategoryFilter("all");
                          setProductVisibilityFilter("all");
                        }}
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  )}
                </div>

                <div className="admin-table-wrap admin-products-table-wrap">
                  <table className="admin-table admin-products-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Marca</th>
                        <th>Precio</th>
                        <th>Inventario</th>
                        <th>Tienda online</th>
                        <th>Categorías</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCatalogProducts.map((product) => (
                        <tr
                          key={product.id}
                          className={editorProduct?.id === product.id ? "is-editing admin-product-row" : "admin-product-row"}
                          onClick={() => fillForEdit(product)}
                        >
                          <td>
                            <div className="admin-product-cell">
                              <img
                                className="admin-product-thumb"
                                src={Array.isArray(product.media) && product.media[0]?.url ? product.media[0].url : "/fotos/foto-inicio.webp"}
                                alt={product.name}
                                loading="lazy"
                              />
                              <span className="admin-product-name">{product.name}</span>
                            </div>
                          </td>
                          <td>{product.brand || "-"}</td>
                          <td>${Number(product.price).toLocaleString("es-AR")}</td>
                          <td>{product.stock ?? 0}</td>
                          <td>{product.isVisible === false ? "Oculto" : "Visible"}</td>
                          <td>{Array.isArray(product.categories) ? product.categories.length : 0}</td>
                          <td className="admin-actions-cell">
                            <div className="admin-product-menu-wrap" onClick={(event) => event.stopPropagation()}>
                              <button
                                type="button"
                                className={`admin-menu-trigger ${openProductMenuId === product.id ? "is-open" : ""}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenProductMenuId((current) => (current === product.id ? null : product.id));
                                }}
                                aria-label={`Acciones para ${product.name}`}
                                aria-expanded={openProductMenuId === product.id}
                              >
                                <span className="admin-menu-dots" aria-hidden="true">⋯</span>
                              </button>

                              {openProductMenuId === product.id && (
                                <div className="admin-actions-menu" role="menu">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      fillForEdit(product);
                                      setOpenProductMenuId(null);
                                    }}
                                  >
                                    Editar producto
                                  </button>
                                  <button type="button" onClick={() => duplicateProduct(product)}>
                                    Duplicar
                                  </button>
                                  <button
                                    type="button"
                                    className="danger-item"
                                    onClick={() => {
                                      if (!window.confirm(`¿Estás seguro de eliminar "${product.name}"?`)) {
                                        return;
                                      }

                                      setOpenProductMenuId(null);
                                      onDelete(product.id);
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!filteredCatalogProducts.length && (
                        <tr>
                          <td colSpan={7}>No hay productos que coincidan con la búsqueda o filtros.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        ) : activeSection === "Inventario" ? (
          <>
            <p className="subtitle">Actualizá de forma rápida el stock de cada producto.</p>

            <div className="admin-form-actions admin-products-actions admin-products-toolbar admin-inventory-toolbar">
              <div className="admin-inventory-toolbar-row">
                <input
                  type="search"
                  className="admin-products-search"
                  placeholder="Buscar por producto o marca"
                  value={adminProductSearch}
                  onChange={(event) => setAdminProductSearch(event.target.value)}
                  aria-label="Buscar productos para inventario"
                />
                <button
                  type="button"
                  className="admin-inventory-filter-btn"
                  onClick={() => setIsInventoryFiltersOpen((current) => !current)}
                  aria-expanded={isInventoryFiltersOpen}
                >
                  Filtros {inventoryActiveFiltersCount > 0 ? `(${inventoryActiveFiltersCount})` : ""}
                </button>
              </div>

              {isInventoryFiltersOpen && (
                <div className="admin-inventory-filters-panel">
                  <label className="admin-inventory-filter-field">
                    <span>Estado de stock</span>
                    <select
                      value={inventoryStockFilter}
                      onChange={(event) => setInventoryStockFilter(event.target.value)}
                    >
                      <option value="all">Todos</option>
                      <option value="out_of_stock">Sin stock</option>
                      <option value="low_stock">Stock bajo</option>
                      <option value="in_stock">Con stock</option>
                    </select>
                  </label>

                  <label className="admin-inventory-filter-field">
                    <span>Categoría</span>
                    <select
                      value={inventoryCategoryFilter}
                      onChange={(event) => setInventoryCategoryFilter(event.target.value)}
                    >
                      <option value="all">Todas</option>
                      {inventoryCategoryOptions.map((categoryName) => (
                        <option key={`inventory-category-${categoryName}`} value={categoryName}>
                          {categoryName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="admin-inventory-filter-field">
                    <span>Visibilidad</span>
                    <select
                      value={inventoryVisibilityFilter}
                      onChange={(event) => setInventoryVisibilityFilter(event.target.value)}
                    >
                      <option value="all">Todos</option>
                      <option value="visible">Visible</option>
                      <option value="hidden">Oculto</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    className="admin-inventory-clear-filters-btn"
                    onClick={() => {
                      setInventoryStockFilter("all");
                      setInventoryCategoryFilter("all");
                      setInventoryVisibilityFilter("all");
                    }}
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>

            {inventorySelectedIds.size > 0 && (
              <div className="admin-inventory-bulk-bar">
                <div className="admin-inventory-bulk-header">
                  <div className="admin-inventory-bulk-badge">
                    <span className="admin-inventory-bulk-badge-count">{inventorySelectedIds.size}</span>
                    <span>producto{inventorySelectedIds.size !== 1 ? "s" : ""} seleccionado{inventorySelectedIds.size !== 1 ? "s" : ""}</span>
                  </div>
                  <button
                    type="button"
                    className="admin-inventory-bulk-dismiss"
                    onClick={() => { setInventorySelectedIds(new Set()); setBulkPriceValue(""); setBulkStockValue(""); }}
                    disabled={inventoryBulkSaving}
                    aria-label="Cancelar selecci\u00f3n"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <div className="admin-inventory-bulk-actions">
                  <div className="admin-inventory-bulk-card">
                    <div className="admin-inventory-bulk-card-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <div className="admin-inventory-bulk-card-body">
                      <span className="admin-inventory-bulk-card-label">Cambiar precio a</span>
                      <div className="admin-inventory-bulk-input-group">
                        <span className="admin-inventory-bulk-prefix">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="admin-inventory-bulk-input"
                          placeholder="1.500"
                          value={formatPriceDisplay(bulkPriceValue)}
                          onChange={(e) => { const raw = e.target.value.replace(/\./g, ""); if (raw === "" || /^\d+$/.test(raw)) setBulkPriceValue(raw); }}
                          disabled={inventoryBulkSaving}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="admin-inventory-bulk-card">
                    <div className="admin-inventory-bulk-card-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                    </div>
                    <div className="admin-inventory-bulk-card-body">
                      <span className="admin-inventory-bulk-card-label">Cambiar inventario a</span>
                      <div className="admin-inventory-bulk-input-group">
                        <input
                          type="text"
                          inputMode="numeric"
                          className="admin-inventory-bulk-input admin-inventory-bulk-input-solo"
                          placeholder="20"
                          value={bulkStockValue}
                          onChange={(e) => { if (/^\d*$/.test(e.target.value)) setBulkStockValue(e.target.value); }}
                          disabled={inventoryBulkSaving}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="admin-inventory-bulk-footer">
                  <button
                    type="button"
                    className="admin-inventory-bulk-save-btn"
                    disabled={inventoryBulkSaving}
                    onClick={handleInventoryBulkSave}
                  >
                    {inventoryBulkSaving ? (
                      <>
                        <svg className="admin-inventory-bulk-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4m0 12v4m-7.07-15.07 2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Guardar seleccionados
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="admin-inventory-bulk-cancel-btn"
                    onClick={() => { setInventorySelectedIds(new Set()); setBulkPriceValue(""); setBulkStockValue(""); }}
                    disabled={inventoryBulkSaving}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="admin-table-wrap admin-products-table-wrap">
              <table className="admin-table admin-products-table admin-inventory-table">
                <thead>
                  <tr>
                    <th className="admin-inventory-checkbox-col">
                      <input
                        type="checkbox"
                        checked={filteredInventoryProducts.length > 0 && inventorySelectedIds.size === filteredInventoryProducts.length}
                        onChange={handleInventoryToggleAll}
                        aria-label="Seleccionar todos"
                      />
                    </th>
                    <th>Producto</th>
                    <th>Marca</th>
                    <th>Precio</th>
                    <th>Inventario</th>
                    <th>Guardar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventoryProducts.map((product) => {
                    const isSaving = Boolean(inventorySavingById[product.id]);
                    const rowError = inventoryErrorsById[product.id];

                    return (
                      <tr key={`inventory-${product.id}`} className={inventorySelectedIds.has(product.id) ? "admin-inventory-row-selected" : ""}>
                        <td className="admin-inventory-checkbox-col">
                          <input
                            type="checkbox"
                            checked={inventorySelectedIds.has(product.id)}
                            onChange={() => handleInventoryToggleSelect(product.id)}
                            aria-label={`Seleccionar ${product.name}`}
                          />
                        </td>
                        <td>
                          <div className="admin-product-cell">
                            <img
                              className="admin-product-thumb"
                              src={Array.isArray(product.media) && product.media[0]?.url ? product.media[0].url : "/fotos/foto-inicio.webp"}
                              alt={product.name}
                              loading="lazy"
                            />
                            <span className="admin-product-name">{product.name}</span>
                          </div>
                        </td>
                        <td>{product.brand || "-"}</td>
                        <td>
                          <div className="admin-inventory-stock-control admin-inventory-price-control">
                            <span className="admin-inventory-price-prefix">$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              min="0"
                              className="admin-inventory-stock-input admin-inventory-price-input"
                              value={formatPriceDisplay(inventoryPriceDraftById[product.id] ?? String(product.price ?? 0))}
                              onChange={(event) => handleInventoryPriceDraftChange(product.id, event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  handleInventorySave(product);
                                }
                              }}
                              disabled={isSaving}
                              aria-label={`Precio de ${product.name}`}
                            />
                          </div>
                        </td>
                        <td>
                          <div className="admin-inventory-stock-control">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="admin-inventory-stock-input"
                              value={inventoryDraftById[product.id] ?? String(product.stock ?? 0)}
                              onChange={(event) => handleInventoryDraftChange(product.id, event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  handleInventorySave(product);
                                }
                              }}
                              disabled={isSaving}
                              aria-label={`Inventario de ${product.name}`}
                            />
                            {rowError && <p className="admin-inventory-error">{rowError}</p>}
                          </div>
                        </td>
                        <td className="admin-actions-cell">
                          <button
                            type="button"
                            className="admin-inventory-save-btn"
                            onClick={() => handleInventorySave(product)}
                            disabled={isSaving}
                          >
                            {isSaving ? "Guardando..." : "Guardar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredInventoryProducts.length && (
                    <tr>
                      <td colSpan={6}>No hay productos que coincidan con la búsqueda o filtros.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : activeSection === "Categorías" ? (
          <>
            {!selectedCategory && (
              <>
                <p className="subtitle">Listado de categorías disponibles para organizar el catálogo.</p>

                <div className="admin-form-actions admin-products-actions admin-products-toolbar admin-categories-toolbar">
                  <div className="admin-products-toolbar-row">
                    <input
                      type="search"
                      className="admin-products-search"
                      placeholder="Buscar categoría"
                      value={categorySearch}
                      onChange={(event) => setCategorySearch(event.target.value)}
                      aria-label="Buscar categoría"
                    />
                    <div className="admin-products-toolbar-actions">
                      <button
                        type="button"
                        className="admin-new-product-btn"
                        onClick={() => setIsCategoryCreateOpen((current) => !current)}
                        aria-expanded={isCategoryCreateOpen}
                      >
                        <span className="admin-new-product-btn-icon" aria-hidden="true">+</span>
                        <span>Nueva categoría</span>
                      </button>
                    </div>
                  </div>
                  {categorySearch.trim() && (
                    <p className="admin-categories-search-count">
                      {filteredCategoriesWithCount.length} categorías encontradas
                    </p>
                  )}
                </div>

                {isCategoryCreateOpen && (
                  <form className="admin-form" onSubmit={handleCreateCategory}>
                    <input
                      type="text"
                      placeholder="Nueva categoría"
                      value={categoryName}
                      onChange={(event) => setCategoryName(event.target.value)}
                      required
                    />
                    <button type="submit">Agregar categoría</button>
                  </form>
                )}

                {!!filteredCategoriesWithCount.length && (
                  <div className="admin-categories-cards-grid">
                    {filteredCategoriesWithCount.map((category) => (
                      <article key={category.id} className="admin-category-card">
                        <div className="admin-category-card-header">
                          <h4>{category.name}</h4>
                          <span className="admin-category-card-count">{category.productCount} productos</span>
                        </div>
                        <div className="row-actions admin-category-card-actions">
                          <button type="button" onClick={() => handleViewCategoryProducts(category)}>
                            Ver productos
                          </button>
                          <button
                            type="button"
                            className="danger-btn"
                            onClick={async () => {
                              if (!window.confirm(`¿Eliminar categoría \"${category.name}\"?`)) {
                                return;
                              }

                              await onDeleteCategory(category.id);
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {!filteredCategoriesWithCount.length && (
                  <p className="admin-categories-empty">
                    {categoriesWithCount.length
                      ? "No hay categorías que coincidan con la búsqueda."
                      : "No hay categorías cargadas."}
                  </p>
                )}
              </>
            )}

            {selectedCategory && (
              <section className="admin-category-products-view" aria-label={`Productos en ${selectedCategory.name}`}>
                <div className="admin-category-products-header">
                  <button type="button" className="secondary-btn" onClick={handleBackToCategories}>
                    Volver a categorías
                  </button>

                  {!isEditingCategoryTitle ? (
                    <div className="admin-category-products-title-row">
                      <h3>
                        Productos en la categoría <span>{selectedCategory.name}</span>
                      </h3>
                      <div className="admin-category-products-title-actions">
                        <button
                          type="button"
                          className="admin-new-product-btn"
                          onClick={() => setIsAddCategoryProductsOpen((current) => !current)}
                          aria-expanded={isAddCategoryProductsOpen}
                        >
                          <span className="admin-new-product-btn-icon" aria-hidden="true">+</span>
                          <span>Agregar productos</span>
                        </button>
                        <button type="button" className="secondary-btn" onClick={handleStartCategoryTitleEdit}>
                          Editar título
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form
                      className="admin-category-title-form"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        await handleSaveCategoryTitle();
                      }}
                    >
                      <input
                        type="text"
                        value={categoryTitleDraft}
                        onChange={(event) => setCategoryTitleDraft(event.target.value)}
                        placeholder="Nombre de la categoría"
                        required
                        disabled={isSavingCategoryTitle}
                      />
                      <button type="submit" disabled={isSavingCategoryTitle}>
                        {isSavingCategoryTitle ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={handleCancelCategoryTitleEdit}
                        disabled={isSavingCategoryTitle}
                      >
                        Cancelar
                      </button>
                    </form>
                  )}

                  {isAddCategoryProductsOpen && (
                    <div className="admin-category-add-products-panel">
                      <div className="admin-category-add-products-topbar">
                        <input
                          type="search"
                          className="admin-products-search"
                          placeholder="Buscar producto o marca"
                          value={categoryProductSearch}
                          onChange={(event) => setCategoryProductSearch(event.target.value)}
                          aria-label="Buscar producto para agregar"
                        />
                        <span className="admin-category-add-products-count">
                          {availableProductsForSelectedCategory.length} disponibles
                        </span>
                      </div>

                      {availableProductsForSelectedCategory.length ? (
                        <div className="admin-category-add-products-list">
                          {availableProductsForSelectedCategory.map((product) => {
                            const isSelected = selectedCategoryProductIds.includes(product.id);

                            return (
                              <article
                                key={product.id}
                                className={`admin-category-add-product-item ${isSelected ? "is-selected" : ""}`}
                              >
                                <img
                                  src={getProductPrimaryImage(product)}
                                  alt={product.name}
                                  className="admin-category-add-product-image"
                                  loading="lazy"
                                />
                                <div className="admin-category-add-product-info">
                                  <h4>{product.name}</h4>
                                  <p>{product.brand || "Sin marca"}</p>
                                </div>
                                <button
                                  type="button"
                                  className="secondary-btn"
                                  onClick={() => handleToggleCategoryProductSelection(product.id)}
                                  disabled={isSavingCategoryProducts}
                                >
                                  {isSelected ? "Seleccionado" : "Seleccionar"}
                                </button>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="admin-categories-empty">No hay productos disponibles para agregar.</p>
                      )}

                      {availableProductsForSelectedCategory.length > 0 && (
                        <div className="admin-category-add-products-actions">
                          <span>{selectedCategoryProductIds.length} seleccionados</span>
                          <button
                            type="button"
                            className="admin-category-save-btn"
                            onClick={handleSaveCategoryProductsSelection}
                            disabled={!selectedCategoryProductIds.length || isSavingCategoryProducts}
                          >
                            {isSavingCategoryProducts ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="admin-category-products-grid">
                  {selectedCategoryProducts.map((product, index) => (
                    <article key={product.id} className="admin-category-product-card">
                      <button
                        type="button"
                        className="admin-category-product-remove-btn"
                        aria-label={`Quitar ${product.name} de ${selectedCategoryName}`}
                        data-tooltip="Sacar producto de esta categoría"
                        onClick={() => handleRemoveProductFromSelectedCategory(product)}
                        disabled={removingCategoryProductId === product.id}
                      >
                        {removingCategoryProductId === product.id ? "..." : "×"}
                      </button>
                      <span className="admin-category-product-rank">{index + 1}</span>
                      <img
                        src={getProductPrimaryImage(product)}
                        alt={product.name}
                        className="admin-category-product-image"
                        loading="lazy"
                      />
                      <div className="admin-category-product-info">
                        <h4>{product.name}</h4>
                        <p>${Number(product.price).toLocaleString("es-AR")}</p>
                      </div>
                    </article>
                  ))}
                </div>

                {categoryRemovalUndo && (
                  <div className="admin-category-undo-toast" role="status" aria-live="polite">
                    <span>
                      Se quitó <strong>{categoryRemovalUndo.productName}</strong> de <strong>{categoryRemovalUndo.removedCategoryName}</strong>.
                    </span>
                    <button
                      type="button"
                      className="admin-category-undo-btn"
                      onClick={handleUndoCategoryRemoval}
                      disabled={removingCategoryProductId === categoryRemovalUndo.productId}
                    >
                      Deshacer
                    </button>
                  </div>
                )}

                {!selectedCategoryProducts.length && (
                  <p className="admin-categories-empty">No hay productos en esta categoría.</p>
                )}
              </section>
            )}
          </>
        ) : activeSection === "Pedidos" ? (
          <>
            <p className="subtitle">Vista completa de pedidos con datos de cliente, pago, envío y líneas importadas desde Wix.</p>

            {!selectedOrder && (
              <div className="admin-orders-summary-grid">
                <article className="admin-orders-summary-card">
                  <h3>Pedidos</h3>
                  <strong>{ordersSummary.count}</strong>
                </article>
                <article className="admin-orders-summary-card">
                  <h3>Facturación total</h3>
                  <strong>{formatOrderCurrency(ordersSummary.totalRevenue, "ARS")}</strong>
                </article>
                <article className="admin-orders-summary-card">
                  <h3>Pagados</h3>
                  <strong>{ordersSummary.paidCount}</strong>
                </article>
                <article className="admin-orders-summary-card">
                  <h3>Con envío</h3>
                  <strong>{ordersSummary.withShippingCount}</strong>
                </article>
              </div>
            )}

            {!selectedOrder ? (
              <>
                <div className="admin-form-actions admin-products-actions admin-products-toolbar admin-products-toolbar-with-filters admin-orders-toolbar">
                  <div className="admin-products-toolbar-row">
                    <p className="admin-orders-toolbar-count">
                      Mostrando {visibleOrders.length} de {orders.length} pedidos
                    </p>
                    <div className="admin-products-toolbar-actions">
                      {selectedOrders.length > 0 ? (
                        <div className="admin-orders-toolbar-selection" role="region" aria-label="Acciones de pedidos seleccionados">
                          <p>{selectedOrders.length} pedido(s) seleccionado(s)</p>
                          <button type="button" className="admin-order-expand-btn" onClick={handleMarkSelectedOrdersFulfilled}>
                            Marcar como cumplido
                          </button>
                          <div className="admin-order-actions-wrap admin-order-print-options-wrap" ref={orderPrintMenuRef}>
                            <button
                              type="button"
                              className={`admin-order-expand-btn${isOrderPrintMenuOpen ? " is-open" : ""}`}
                              onClick={() => setIsOrderPrintMenuOpen((current) => !current)}
                              aria-expanded={isOrderPrintMenuOpen}
                              aria-haspopup="menu"
                            >
                              Imprimir pedido
                            </button>

                            {isOrderPrintMenuOpen && (
                              <div className="admin-order-actions-menu" role="menu">
                                <button type="button" role="menuitem" onClick={handleDownloadSelectedOrdersPdf}>
                                  <span aria-hidden="true">⬇️</span>
                                  <span>Descargar PDF</span>
                                </button>
                                <button type="button" role="menuitem" onClick={handlePrintSelectedOrders}>
                                  <span aria-hidden="true">🖨️</span>
                                  <span>Imprimir</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="admin-inventory-filter-btn"
                          onClick={() => setIsOrderFiltersOpen((current) => !current)}
                          aria-expanded={isOrderFiltersOpen}
                        >
                          Filtros {orderActiveFiltersCount > 0 ? `(${orderActiveFiltersCount})` : ""}
                        </button>
                      )}
                    </div>
                  </div>

                  {isOrderFiltersOpen && selectedOrders.length === 0 && (
                    <div className="admin-inventory-filters-panel admin-orders-filters-panel">
                      <fieldset className="admin-order-date-filter-fieldset">
                        <legend>Fecha de creación</legend>

                        <label className="admin-order-date-filter-option">
                          <input
                            type="radio"
                            name="admin-order-created-date"
                            value="all"
                            checked={orderCreatedDateMode === "all"}
                            onChange={() => setOrderCreatedDateMode("all")}
                          />
                          <span>Todos</span>
                        </label>

                        <label className="admin-order-date-filter-option">
                          <input
                            type="radio"
                            name="admin-order-created-date"
                            value="last_7_days"
                            checked={orderCreatedDateMode === "last_7_days"}
                            onChange={() => setOrderCreatedDateMode("last_7_days")}
                          />
                          <span>Últimos 7 días</span>
                        </label>

                        <label className="admin-order-date-filter-option">
                          <input
                            type="radio"
                            name="admin-order-created-date"
                            value="last_14_days"
                            checked={orderCreatedDateMode === "last_14_days"}
                            onChange={() => setOrderCreatedDateMode("last_14_days")}
                          />
                          <span>Últimos 14 días</span>
                        </label>

                        <label className="admin-order-date-filter-option">
                          <input
                            type="radio"
                            name="admin-order-created-date"
                            value="last_month"
                            checked={orderCreatedDateMode === "last_month"}
                            onChange={() => setOrderCreatedDateMode("last_month")}
                          />
                          <span>El mes pasado</span>
                        </label>

                        <label className="admin-order-date-filter-option">
                          <input
                            type="radio"
                            name="admin-order-created-date"
                            value="custom"
                            checked={orderCreatedDateMode === "custom"}
                            onChange={() => setOrderCreatedDateMode("custom")}
                          />
                          <span>Personalizar</span>
                        </label>

                        {orderCreatedDateMode === "custom" && (
                          <div className="admin-order-date-custom-grid">
                            <label className="admin-order-date-custom-field">
                              <span>Desde</span>
                              <input
                                type="date"
                                className="admin-order-date-custom-input"
                                value={orderCreatedDateFromFilter}
                                onChange={(event) => setOrderCreatedDateFromFilter(event.target.value)}
                              />
                            </label>

                            <label className="admin-order-date-custom-field">
                              <span>Hasta</span>
                              <input
                                type="date"
                                className="admin-order-date-custom-input"
                                value={orderCreatedDateToFilter}
                                onChange={(event) => setOrderCreatedDateToFilter(event.target.value)}
                              />
                            </label>
                          </div>
                        )}
                      </fieldset>

                      <div className="admin-orders-filters-grid">
                        <label className="admin-inventory-filter-field">
                          <span>Estado de cumplimiento</span>
                          <select
                            value={orderFulfillmentFilter}
                            onChange={(event) => setOrderFulfillmentFilter(event.target.value)}
                          >
                            <option value="all">Todos</option>
                            {orderFulfillmentOptions.map((status) => (
                              <option key={`order-fulfillment-${status}`} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="admin-inventory-filter-field">
                          <span>Producto</span>
                          <input
                            type="search"
                            list="admin-order-product-options"
                            value={orderProductFilter}
                            onChange={(event) => setOrderProductFilter(event.target.value)}
                            placeholder="Buscar producto"
                            aria-label="Buscar producto en pedidos"
                          />
                          <datalist id="admin-order-product-options">
                            {orderProductOptions.map((productName) => (
                              <option key={`order-product-${productName}`} value={productName} />
                            ))}
                          </datalist>
                        </label>

                        <label className="admin-inventory-filter-field">
                          <span>Método de entrega</span>
                          <select
                            value={orderShippingMethodFilter}
                            onChange={(event) => setOrderShippingMethodFilter(event.target.value)}
                          >
                            <option value="all">Todos</option>
                            {orderShippingMethodOptions.map((shippingMethod) => (
                              <option key={`order-shipping-${shippingMethod}`} value={shippingMethod}>
                                {shippingMethod}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <button
                        type="button"
                        className="admin-inventory-clear-filters-btn admin-orders-clear-filters-btn"
                        onClick={() => {
                          setOrderCreatedDateMode("all");
                          setOrderCreatedDateFromFilter("");
                          setOrderCreatedDateToFilter("");
                          setOrderFulfillmentFilter("all");
                          setOrderProductFilter("");
                          setOrderShippingMethodFilter("all");
                        }}
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  )}
                </div>
                <div className="admin-orders-table-wrap">
                  <table className="admin-table admin-orders-table">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            checked={allVisibleOrdersSelected}
                            ref={(input) => {
                              if (input) {
                                input.indeterminate = isSomeVisibleOrdersSelected;
                              }
                            }}
                            onChange={(event) => {
                              event.stopPropagation();
                              handleVisibleOrdersSelectionChange(event.target.checked);
                            }}
                            aria-label="Seleccionar todos los pedidos visibles"
                          />
                        </th>
                        <th>Pedido</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Tipo</th>
                        <th>Pago</th>
                        <th>Cumplimiento</th>
                        <th>Total</th>
                        <th>Ítems</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleOrders.map((order) => {
                        const totalItems = Number(order.itemsCount || 0) || (order.lines || []).reduce((acc, line) => acc + Number(line.quantity || 0), 0);
                        const currency = order.currency || "ARS";
                        const paymentLabel = derivePaymentBadge(order.status);
                        const fulfillmentLabel = deriveFulfillmentBadge(order.status, order.shippingMethod, order.customerAddress);
                        return (
                          <tr
                            key={`summary-${order.id}`}
                            className="admin-order-table-row"
                            onClick={() => openOrderDetail(order.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openOrderDetail(order.id);
                              }
                            }}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.includes(order.id)}
                                onChange={(event) => handleOrderSelectionChange(order.id, event.target.checked)}
                                onClick={(event) => event.stopPropagation()}
                                aria-label={`Seleccionar pedido #${order.wixOrderNumber || order.id}`}
                              />
                            </td>
                            <td>
                              <strong>#{order.wixOrderNumber || order.id}</strong>
                            </td>
                            <td>{formatOrderDateTime(order.createdAt)}</td>
                            <td>
                              <strong>{order.customerName || "-"}</strong>
                            </td>
                            <td>
                              {(() => {
                                const m = String(order.shippingMethod || "").trim().toLowerCase();
                                const isPickup = m === "pickup" || String(order.customerAddress || "").toLowerCase().includes("retiro en el local");
                                return (
                                  <span className={`admin-order-type-tag ${isPickup ? "is-pickup" : "is-delivery"}`} title={isPickup ? "Retiro en el local – Acevedo 200" : "Envío a domicilio"}>
                                    {isPickup ? "🏪 Pick up" : "🚚 Envío"}
                                  </span>
                                );
                              })()}
                            </td>
                            <td>
                              <span className={`admin-order-badge ${derivedBadgeTone(paymentLabel)}`}>{paymentLabel}</span>
                            </td>
                            <td>
                              <span className={`admin-order-badge ${derivedBadgeTone(fulfillmentLabel)}`}>{fulfillmentLabel}</span>
                            </td>
                            <td>
                              <div className="admin-order-total-cell">
                                <span>{formatOrderCurrency(order.total, currency)}</span>
                                <button
                                  type="button"
                                  className="admin-order-invoice-btn"
                                  data-tooltip="Ver factura"
                                  aria-label={`Ver factura del pedido #${order.wixOrderNumber || order.id}`}
                                  onClick={async (event) => {
                                    event.stopPropagation();
                                    const pendingPopup = openPendingInvoiceWindow();

                                    try {
                                      await openOrderInvoice(order, pendingPopup);
                                    } catch (error) {
                                      if (pendingPopup && !pendingPopup.closed) {
                                        pendingPopup.close();
                                      }

                                      setOrderActionMessage(error?.message || "No se pudo generar la factura.");
                                    }
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <path d="M7.5 3.5h6.4l4.1 4.1V20a1 1 0 0 1-1 1h-9.5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M13.9 3.5V7.6h4.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M11.7 16.6c1.2 0 2-.6 2-1.5 0-.8-.5-1.2-1.8-1.5-1-.2-1.4-.5-1.4-1s.5-1 1.3-1c.8 0 1.3.3 1.7.7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M11.8 10.9v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                            <td>{totalItems}</td>
                            <td>
                              <button
                                type="button"
                                className="admin-order-expand-btn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openOrderDetail(order.id);
                                }}
                              >
                                Ver detalle
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {!visibleOrders.length && (
                        <tr>
                          <td colSpan={10}>Todavía no hay pedidos cargados.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              (() => {
                const order = selectedOrder;
                const currency = order.currency || "ARS";
                const paymentLabel = derivePaymentBadge(order.status);
                const fulfillmentLabel = deriveFulfillmentBadge(order.status, order.shippingMethod, order.customerAddress);
                const statusFlow = getOrderStatusFlow(order.shippingMethod, order.customerAddress);
                const orderItems = Array.isArray(order.lines) ? order.lines : [];
                const totalItems = Number(order.itemsCount || 0) || orderItems.reduce((acc, line) => acc + Number(line.quantity || 0), 0);
                const itemsSubtotal = orderItems.reduce((acc, line) => acc + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0);
                const timelineItems = buildOrderActivityItems(order, paymentLabel, fulfillmentLabel);
                const isUnpaidUnprocessedOrder = paymentLabel === "No pagado" && fulfillmentLabel === "No procesado";
                const isPaidUnprocessedOrder = paymentLabel === "Pagado" && fulfillmentLabel === "No procesado";
                const isPaidCompletedOrder = paymentLabel === "Pagado" && ["Entregado", "Enviado", "Listo para retiro"].includes(fulfillmentLabel);
                const primaryOrderStatusAction = !["Entregado", "Enviado", "Listo para retiro"].includes(fulfillmentLabel)
                  ? { key: "mark_completed", icon: "✅", label: "Marcar como completado" }
                  : {
                    key: "mark_unprocessed",
                    icon: "✖️",
                    label: isPaidCompletedOrder ? "Pedido marcado como completado" : "Marcar como no procesado"
                  };

                return (
                  <section className="admin-order-detail-shell" aria-label={`Detalle del pedido #${order.wixOrderNumber || order.id}`}>
                    <header className="admin-order-detail-header">
                      <div>
                        <p className="admin-order-detail-overline">Pedido n.º {order.wixOrderNumber || order.id}</p>
                        <h3>Detalle del pedido</h3>
                        <p className="admin-order-detail-date">Realizado el {formatOrderDateTime(order.createdAt)}</p>
                        {orderActionMessage && (
                          <p className="admin-order-action-message">{orderActionMessage}</p>
                        )}
                      </div>

                      <div className="admin-order-detail-header-actions">
                        <span className={`admin-order-badge ${derivedBadgeTone(paymentLabel)}`}>{paymentLabel}</span>
                        <span className={`admin-order-badge ${derivedBadgeTone(fulfillmentLabel)}`}>{fulfillmentLabel}</span>
                        <select
                          className="admin-order-status-select"
                          value={order.status}
                          onChange={(event) => {
                            const newStatus = event.target.value;
                            if (newStatus === "cancelado") {
                              const confirmed = window.confirm(`¿Estás seguro de cancelar el pedido #${order.wixOrderNumber || order.id}? Esta acción no se puede deshacer fácilmente.`);
                              if (!confirmed) {
                                event.target.value = order.status;
                                return;
                              }
                            }
                            setOrderActionMessage(`Actualizando a "${ORDER_STATUS_LABELS[newStatus]}"...`);
                            onOrderStatusChange(order.id, newStatus).then(() => {
                              setOrderActionMessage(`${ORDER_STATUS_ICONS[newStatus]} Pedido #${order.wixOrderNumber || order.id} → ${ORDER_STATUS_LABELS[newStatus]}`);
                            }).catch((err) => {
                              setOrderActionMessage(`Error: ${err.message}`);
                            });
                          }}
                        >
                          {statusFlow.map((status) => (
                            <option key={status} value={status}>{ORDER_STATUS_ICONS[status]} {ORDER_STATUS_LABELS[status] || status}</option>
                          ))}
                        </select>
                        <div className="admin-order-actions-wrap" ref={orderActionsRef}>
                          <button
                            type="button"
                            className={`admin-order-actions-trigger${isOrderActionsOpen ? " is-open" : ""}`}
                            onClick={() => setIsOrderActionsOpen((current) => !current)}
                            aria-expanded={isOrderActionsOpen}
                            aria-haspopup="menu"
                          >
                            <span aria-hidden="true">⚙️</span>
                            <span>Más acciones</span>
                          </button>

                          {isOrderActionsOpen && (
                            <div className="admin-order-actions-menu admin-order-actions-menu-main" role="menu">
                              <button type="button" role="menuitem" onClick={() => handleOrderQuickAction(primaryOrderStatusAction.key, order)}>
                                <span aria-hidden="true">{primaryOrderStatusAction.icon}</span>
                                <span>{primaryOrderStatusAction.label}</span>
                              </button>
                              <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("edit", order)}>
                                <span aria-hidden="true">✏️</span>
                                <span>Editar pedido</span>
                              </button>
                              <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("print", order)}>
                                <span aria-hidden="true">🖨️</span>
                                <span>Imprimir pedido</span>
                              </button>
                              {isUnpaidUnprocessedOrder ? (
                                <>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("cancel_order", order)}>
                                    <span aria-hidden="true">🛍️</span>
                                    <span>Cancelar pedido</span>
                                  </button>
                                  <button type="button" role="menuitem" disabled className="is-disabled" aria-disabled="true">
                                    <span aria-hidden="true">💸</span>
                                    <span>Reembolsar</span>
                                  </button>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("invoice", order)}>
                                    <span aria-hidden="true">🧾</span>
                                    <span>Cobrar con factura</span>
                                  </button>
                                </>
                              ) : isPaidUnprocessedOrder ? (
                                <>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("cancel_and_refund", order)}>
                                    <span aria-hidden="true">🛍️</span>
                                    <span>Cancelar y reembolsar</span>
                                  </button>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("refund", order)}>
                                    <span aria-hidden="true">💸</span>
                                    <span>Reembolsar</span>
                                  </button>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("invoice", order)}>
                                    <span aria-hidden="true">🧾</span>
                                    <span>Crear factura</span>
                                  </button>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("receipt", order)}>
                                    <span aria-hidden="true">🧷</span>
                                    <span>Ver recibo</span>
                                  </button>
                                </>
                              ) : isPaidCompletedOrder ? (
                                <>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("refund", order)}>
                                    <span aria-hidden="true">💸</span>
                                    <span>Reembolsar</span>
                                  </button>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("invoice", order)}>
                                    <span aria-hidden="true">🧾</span>
                                    <span>Ver factura</span>
                                  </button>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("receipt", order)}>
                                    <span aria-hidden="true">🧷</span>
                                    <span>Ver recibo</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("send_shipping_email", order)}>
                                    <span aria-hidden="true">✉️</span>
                                    <span>Enviar email con confirmación de envío</span>
                                  </button>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("download_pdf", order)}>
                                    <span aria-hidden="true">⬇️</span>
                                    <span>Descargar PDF</span>
                                  </button>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("refund", order)}>
                                    <span aria-hidden="true">💸</span>
                                    <span>Reembolsar</span>
                                  </button>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("invoice", order)}>
                                    <span aria-hidden="true">🧾</span>
                                    <span>Ver factura</span>
                                  </button>
                                  <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("receipt", order)}>
                                    <span aria-hidden="true">🧷</span>
                                    <span>Ver recibo</span>
                                  </button>
                                </>
                              )}
                              <button type="button" role="menuitem" onClick={() => handleOrderQuickAction("archive", order)}>
                                <span aria-hidden="true">🗂️</span>
                                <span>Archivar</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <button type="button" className="admin-order-expand-btn is-back" onClick={closeOrderDetail}>
                          <span aria-hidden="true">←</span>
                          <span>Volver a pedidos</span>
                        </button>
                      </div>
                    </header>

                    <div className="admin-order-detail-layout">
                      <div className="admin-order-detail-main">
                        <article className="admin-order-detail-card">
                          <div className="admin-order-detail-card-header">
                            <h4>Ítems ({totalItems})</h4>
                          </div>
                          <div className="admin-order-detail-items">
                            {orderItems.map((line, index) => (
                              <div key={`${order.id}-${line.productName}-${index}`} className="admin-order-detail-item-row">
                                <img
                                  src={resolveOrderLineImageUrl(line, products)}
                                  alt={line.productName || "Producto"}
                                  className="admin-order-detail-item-image"
                                  loading="lazy"
                                />
                                <div className="admin-order-detail-item-info">
                                  <strong>{line.productName || "Producto"}</strong>
                                  <span>{[line.variant, line.sku].filter(hasValue).join(" · ") || "Sin variante / SKU"}</span>
                                </div>
                                <div className="admin-order-detail-item-metrics">
                                  <span>x{Number(line.quantity || 0)}</span>
                                  <strong>{formatOrderCurrency(line.unitPrice, currency)}</strong>
                                </div>
                              </div>
                            ))}
                            {!orderItems.length && <p className="admin-orders-empty">No hay líneas para este pedido.</p>}
                          </div>
                        </article>

                        <article className="admin-order-detail-card">
                          <div className="admin-order-detail-card-header">
                            <h4>Información de pago</h4>
                            <span className={`admin-order-badge ${derivedBadgeTone(paymentLabel)}`}>{paymentLabel}</span>
                          </div>

                          <div className="admin-order-payment-grid">
                            <div><span>Ítems</span><strong>{formatOrderCurrency(itemsSubtotal, currency)}</strong></div>
                            <div><span>Envío</span><strong>{formatOrderCurrency(order.shippingCost, currency)}</strong></div>
                            <div><span>Impuestos</span><strong>{formatOrderCurrency(order.taxTotal, currency)}</strong></div>
                            <div><span>Descuento</span><strong>{formatOrderCurrency(order.discount, currency)}</strong></div>
                            <div><span>Total</span><strong>{formatOrderCurrency(order.total, currency)}</strong></div>
                            <div><span>Método</span><strong>{formatPaymentMethodLabel(order.paymentMethod)}</strong></div>
                          </div>

                          {order.paymentMethod === "mercadopago" && (
                            <div>
                              <button
                                type="button"
                                className="admin-verify-payment-btn"
                                disabled={isVerifyingPayment}
                                onClick={() => handleOrderQuickAction("verify_payment", order)}
                              >
                                <span aria-hidden="true">{isVerifyingPayment ? "⏳" : "🔍"}</span>
                                <span>{isVerifyingPayment ? "Verificando..." : "Verificar pago en MP"}</span>
                              </button>

                              {paymentVerification && (
                                <div className={`admin-verify-payment-result ${paymentVerification.mpStatus === "approved" && paymentVerification.amountMatch ? "admin-verify-payment-result--ok" : "admin-verify-payment-result--error"}`}>
                                  <div><strong>Estado MP:</strong> {paymentVerification.mpStatus || "sin pagos"}</div>
                                  {paymentVerification.mpAmount != null && <div><strong>Monto pagado:</strong> ${paymentVerification.mpAmount}</div>}
                                  {paymentVerification.orderTotal != null && <div><strong>Total pedido:</strong> ${paymentVerification.orderTotal}</div>}
                                  {paymentVerification.amountMatch != null && (
                                    <div><strong>Monto:</strong> {paymentVerification.amountMatch ? "✅ Coincide" : "⚠️ NO coincide"}</div>
                                  )}
                                  {paymentVerification.mpDateApproved && <div><strong>Aprobado:</strong> {new Date(paymentVerification.mpDateApproved).toLocaleString("es-AR")}</div>}
                                  {paymentVerification.mpStatusDetail && <div><strong>Detalle:</strong> {paymentVerification.mpStatusDetail}</div>}
                                  {paymentVerification.message && <div>{paymentVerification.message}</div>}

                                  {paymentVerification.mpStatus === "approved" && paymentVerification.amountMatch && order.paymentStatus !== "approved" && (
                                    <button
                                      type="button"
                                      className="admin-sync-payment-btn"
                                      disabled={isSyncingPayment}
                                      onClick={async () => {
                                        setIsSyncingPayment(true);
                                        try {
                                          const result = await onSyncPayment(order.id);
                                          if (result?.ok) {
                                            setOrderActionMessage("✅ Pago sincronizado — pedido marcado como pagado");
                                            setPaymentVerification(null);
                                          }
                                        } catch (err) {
                                          setOrderActionMessage(err?.message || "Error al sincronizar pago");
                                        } finally {
                                          setIsSyncingPayment(false);
                                        }
                                      }}
                                    >
                                      <span aria-hidden="true">{isSyncingPayment ? "⏳" : "✅"}</span>
                                      <span>{isSyncingPayment ? "Sincronizando..." : "Marcar como pagado"}</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </article>

                        <article className="admin-order-detail-card">
                          <div className="admin-order-detail-card-header">
                            <h4>Actividad del pedido</h4>
                          </div>

                          <ul className="admin-order-activity-list">
                            {timelineItems.map((item) => (
                              <li key={item.id} className="admin-order-activity-item">
                                <div>
                                  <strong>{item.title}</strong>
                                  <p>{item.detail}</p>
                                </div>
                                <time>{formatOrderDateTime(item.at)}</time>
                              </li>
                            ))}
                          </ul>
                        </article>
                      </div>

                      <aside className="admin-order-detail-side">
                        <article className="admin-order-detail-card">
                          <div className="admin-order-detail-card-header">
                            <h4>Información del pedido</h4>
                          </div>

                          <div className="admin-order-info-list">
                            <div><span>Contacto</span><strong>{order.customerName || "-"}</strong><p>{order.contactEmail || "-"}</p></div>
                            <div><span>Teléfono</span><strong>{order.customerPhone || order.recipientPhone || "-"}</strong></div>
                            <div><span>Método de envío</span><strong>{order.shippingMethod || "-"}</strong><p>{order.deliveryTime || "-"}</p></div>
                            <div>
                              <span>Dirección de envío</span>
                              <strong>{order.customerAddress || "-"}</strong>
                              <p>{[order.shippingCity, order.shippingState, order.shippingPostalCode, order.shippingCountry].filter(hasValue).join(" · ") || "-"}</p>
                            </div>
                            <div>
                              <span>Dirección de facturación</span>
                              <strong>{order.billingAddress || "Igual que la de envío"}</strong>
                              <p>{[order.billingCity, order.billingState, order.billingPostalCode, order.billingCountry].filter(hasValue).join(" · ") || "-"}</p>
                            </div>
                          </div>
                        </article>

                        <article className="admin-order-detail-card">
                          <div className="admin-order-detail-card-header">
                            <h4>Información adicional</h4>
                          </div>

                          <div className="admin-order-info-list">
                            <div><span>Zona de envío</span><strong>{order.shippingZone || "-"}</strong></div>
                            <div><span>Tracking</span><strong>{order.trackingNumber || "-"}</strong></div>
                            <div><span>Nota del cliente</span><p>{order.customerNote || "Sin nota"}</p></div>
                            <div><span>Dato adicional</span><p>{order.purchaseExtraData || "Sin información adicional"}</p></div>
                          </div>
                        </article>
                      </aside>
                    </div>
                  </section>
                );
              })()
            )}
          </>
        ) : activeSection === "Envíos" ? (
          <>
            <p className="subtitle">Reglas por zona (CABA, Gran Buenos Aires y Retiro en el Local) y cotización automática.</p>

            <div className="admin-table-wrap">
              <table className="admin-table admin-shipping-table">
                <thead>
                  <tr>
                    <th>Zona</th>
                    <th>Costo base</th>
                    <th>Gratis desde</th>
                    <th>ETA min/max</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleShippingRules.map((rule) => {
                    const isEditingRule = editingShippingRuleId === rule.id;

                    return (
                    <tr key={rule.id} className={isEditingRule ? "is-editing" : ""}>
                      <td>{getShippingZoneLabel(rule.zone)}</td>
                      <td>
                        {isEditingRule ? (
                          <input
                            className="admin-shipping-input"
                            type="number"
                            min="0"
                            step="1"
                            value={editingShippingRuleForm.baseCost}
                            onChange={(event) => {
                              const { value } = event.target;
                              setEditingShippingRuleForm((current) => ({ ...current, baseCost: value }));
                            }}
                          />
                        ) : (
                          <>${Number(rule.baseCost).toLocaleString("es-AR")}</>
                        )}
                      </td>
                      <td>
                        {isEditingRule ? (
                          <input
                            className="admin-shipping-input"
                            type="number"
                            min="0"
                            step="1"
                            value={editingShippingRuleForm.freeShippingFrom}
                            onChange={(event) => {
                              const { value } = event.target;
                              setEditingShippingRuleForm((current) => ({ ...current, freeShippingFrom: value }));
                            }}
                          />
                        ) : (
                          <>${Number(rule.freeShippingFrom).toLocaleString("es-AR")}</>
                        )}
                      </td>
                      <td>
                        {isEditingRule ? (
                          <div className="admin-shipping-eta-fields">
                            <input
                              className="admin-shipping-input"
                              type="number"
                              min="1"
                              step="1"
                              value={editingShippingRuleForm.etaMinDays}
                              onChange={(event) => {
                                const { value } = event.target;
                                setEditingShippingRuleForm((current) => ({ ...current, etaMinDays: value }));
                              }}
                            />
                            <input
                              className="admin-shipping-input"
                              type="number"
                              min="1"
                              step="1"
                              value={editingShippingRuleForm.etaMaxDays}
                              onChange={(event) => {
                                const { value } = event.target;
                                setEditingShippingRuleForm((current) => ({ ...current, etaMaxDays: value }));
                              }}
                            />
                          </div>
                        ) : (
                          <>
                            {rule.etaMinDays} - {rule.etaMaxDays} días
                          </>
                        )}
                      </td>
                      <td>
                        {isEditingRule ? (
                          <div className="admin-shipping-actions">
                            <button type="button" className="admin-shipping-save-btn" onClick={() => handleSaveShippingRule(rule)}>
                              Guardar
                            </button>
                            <button type="button" className="secondary-btn" onClick={handleCancelEditShippingRule}>
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button type="button" className="admin-shipping-edit-btn" onClick={() => handleStartEditShippingRule(rule)}>
                            Editar regla
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : activeSection === "Promociones" ? (
          <>
            <p className="subtitle">Cupones y promociones (2x1, volumen y descuentos).</p>

            <form className="admin-form" onSubmit={handlePromotionCreate}>
              <input
                type="text"
                placeholder="Código"
                value={promoForm.code}
                onChange={(event) => setPromoForm((current) => ({ ...current, code: event.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Nombre"
                value={promoForm.name}
                onChange={(event) => setPromoForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <select
                value={promoForm.type}
                onChange={(event) => setPromoForm((current) => ({ ...current, type: event.target.value }))}
              >
                <option value="percent">Porcentaje</option>
                <option value="fixed">Monto fijo</option>
                <option value="volume">Volumen</option>
                <option value="combo">Combo</option>
                <option value="two_for_one">2x1</option>
              </select>
              <input
                type="number"
                placeholder="Valor"
                value={promoForm.value}
                onChange={(event) => setPromoForm((current) => ({ ...current, value: event.target.value }))}
                required
              />
              <input
                type="number"
                min="0"
                placeholder="Subtotal mínimo"
                value={promoForm.minSubtotal}
                onChange={(event) => setPromoForm((current) => ({ ...current, minSubtotal: event.target.value }))}
              />
              <button type="submit">Crear promoción</button>
            </form>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((promotion) => (
                    <tr key={promotion.id}>
                      <td>{promotion.code}</td>
                      <td>{promotion.name}</td>
                      <td>{promotion.type}</td>
                      <td>{promotion.value}</td>
                      <td>{promotion.active ? "Activa" : "Inactiva"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form className="admin-form" onSubmit={handlePromotionTest}>
              <input
                type="text"
                placeholder="Código para probar"
                value={promoTest.code}
                onChange={(event) => setPromoTest((current) => ({ ...current, code: event.target.value }))}
                required
              />
              <input
                type="number"
                min="0"
                placeholder="Subtotal"
                value={promoTest.subtotal}
                onChange={(event) => setPromoTest((current) => ({ ...current, subtotal: event.target.value }))}
                required
              />
              <button type="submit">Aplicar cupón</button>
            </form>

            {promoTestResult && (
              <p className="subtitle">
                Descuento: ${Number(promoTestResult.discount).toLocaleString("es-AR")} | Total final: ${" "}
                {Number(promoTestResult.totalWithDiscount).toLocaleString("es-AR")}
              </p>
            )}
          </>
        ) : activeSection === "Clientes" ? (
          <>
            <div className="admin-customers-subtitle-row">
              <p className="subtitle">Todos los que compraron al menos una vez.</p>
              <p className="admin-customers-total">Total: {customersWithOrders.length}</p>
            </div>

            {selectedCustomer ? (
              <div className="admin-customer-detail">
                <button type="button" className="admin-customer-back" onClick={() => setSelectedCustomerId(null)}>
                  ← Volver a contactos
                </button>

                <div className="admin-customer-detail-card">
                  <div className="admin-customer-detail-header">
                    <div className="admin-customer-avatar-wrap">
                      {selectedCustomer.avatarUrl ? (
                        <img src={selectedCustomer.avatarUrl} alt={selectedCustomer.name} className="admin-customer-avatar" />
                      ) : (
                        <div className="admin-customer-avatar admin-customer-avatar-fallback">{customerInitials(selectedCustomer.name)}</div>
                      )}
                    </div>
                    <div>
                      <h3>{selectedCustomer.name || "Sin nombre"}</h3>
                      <p>{selectedCustomer.memberStatus || "Sin estado"}</p>
                    </div>
                  </div>

                  <div className="admin-customer-detail-grid">
                    <div>
                      <strong>Email principal</strong>
                      <p>{selectedCustomer.email || "-"}</p>
                    </div>
                    <div>
                      <strong>Teléfono principal</strong>
                      <p>{selectedCustomer.phone || "-"}</p>
                    </div>
                    <div>
                      <strong>Estado de miembro</strong>
                      <p>{selectedCustomer.memberStatus || "-"}</p>
                    </div>
                    <div>
                      <strong>Última actividad</strong>
                      <p>
                        {selectedCustomer.lastActivity || "-"}
                        {selectedCustomer.lastActivityAt ? ` · ${formatCustomerDateTime(selectedCustomer.lastActivityAt)}` : ""}
                      </p>
                    </div>
                    <div className="admin-customer-address-block">
                      <strong>Dirección</strong>
                      <p>{selectedCustomer.address || "-"}</p>
                    </div>
                  </div>

                  <div className="admin-customer-activity-wrap">
                    <h4>Registro de actividad</h4>
                    {selectedCustomerActivity.length ? (
                      <ul className="admin-customer-activity-list">
                        {selectedCustomerActivity.map((eventItem) => (
                          <li key={eventItem.id} className="admin-customer-activity-item">
                            <span className="admin-customer-activity-dot" aria-hidden="true" />
                            <div className="admin-customer-activity-content">
                              <p>
                                {eventItem.message}
                                {eventItem.linkLabel ? (
                                  <button type="button" className="admin-customer-activity-link">
                                    {eventItem.linkLabel}
                                  </button>
                                ) : null}
                              </p>
                            </div>
                            <time>{formatCustomerDateTime(eventItem.at)}</time>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="admin-customer-activity-empty">Sin actividad registrada todavía.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table admin-customers-table">
                  <thead>
                    <tr>
                      <th>Foto</th>
                      <th>Nombre</th>
                      <th>Mail</th>
                      <th>Teléfono</th>
                      <th>Estado de miembro</th>
                      <th>Última actividad</th>
                      <th>Dirección</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customersWithOrders.map((customer) => (
                      <tr key={customer.id} className="admin-customer-row" onClick={() => setSelectedCustomerId(customer.id)}>
                        <td>
                          {customer.avatarUrl ? (
                            <img src={customer.avatarUrl} alt={customer.name} className="admin-customer-avatar admin-customer-avatar-sm" />
                          ) : (
                            <div className="admin-customer-avatar admin-customer-avatar-fallback admin-customer-avatar-sm">
                              {customerInitials(customer.name)}
                            </div>
                          )}
                        </td>
                        <td>{customer.name || "-"}</td>
                        <td>{customer.email || "-"}</td>
                        <td>{customer.phone || "-"}</td>
                        <td>{customer.memberStatus || "-"}</td>
                        <td>
                          {customer.lastActivity || "-"}
                          <div className="admin-customer-activity-date">{formatCustomerDateTime(customer.lastActivityAt)}</div>
                        </td>
                        <td>{customer.address || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : activeSection === "Miembros" ? (
          <>
            <p className="subtitle">Todos los usuarios que se loguean en el sitio.</p>

            <section className="admin-people-section" aria-label="Miembros">
              <article className="admin-people-card" aria-label="Miembros registrados">
                <div className="admin-people-card-header">
                  <h3>Miembros</h3>
                  <strong>{membersCount}</strong>
                </div>

                {memberDeleteMessage && (
                  <p className={`admin-members-msg ${memberDeleteMessage.includes("Error") ? "admin-members-msg-error" : "admin-members-msg-success"}`}>
                    {memberDeleteMessage}
                  </p>
                )}

                {selectedMemberIds.size > 0 && (
                  <div className="admin-members-bulk-bar">
                    <span>{selectedMemberIds.size} seleccionado{selectedMemberIds.size > 1 ? "s" : ""}</span>
                    <button
                      type="button"
                      className="admin-members-bulk-delete-btn"
                      disabled={isMemberDeleting}
                      onClick={() => setMemberDeleteConfirm({ ids: [...selectedMemberIds] })}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM8 9h8v10H8zm7.5-5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                      Eliminar seleccionados
                    </button>
                  </div>
                )}

                <div className="admin-table-wrap">
                  <table className="admin-table admin-people-table">
                    <thead>
                      <tr>
                        <th style={{width:"36px"}}>
                          <input
                            type="checkbox"
                            checked={allMembersSelected}
                            onChange={toggleAllMembers}
                            aria-label="Seleccionar todos"
                          />
                        </th>
                        <th>Nombre</th>
                        <th>Mail</th>
                        <th>Rol</th>
                        <th>Alta</th>
                        <th style={{width:"44px"}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.length ? members.map((member) => (
                        <tr key={member.id} className={selectedMemberIds.has(member.id) ? "admin-member-row-selected" : ""}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedMemberIds.has(member.id)}
                              onChange={() => toggleMemberSelection(member.id)}
                              aria-label={`Seleccionar ${member.name || member.email}`}
                            />
                          </td>
                          <td>{member.name || "-"}</td>
                          <td>{member.email || "-"}</td>
                          <td>{member.role || "-"}</td>
                          <td>{formatCustomerDateTime(member.createdAt)}</td>
                          <td>
                            <button
                              type="button"
                              className="admin-member-delete-btn"
                              title="Eliminar usuario"
                              disabled={isMemberDeleting}
                              onClick={() => setMemberDeleteConfirm({ ids: [member.id], name: member.name || member.email })}
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM8 9h8v10H8zm7.5-5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6}>Sin miembros para mostrar.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            {memberDeleteConfirm && (
              <div className="admin-members-confirm-backdrop" onClick={() => !isMemberDeleting && setMemberDeleteConfirm(null)}>
                <div className="admin-members-confirm-modal" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                  <h3>¿Eliminar {memberDeleteConfirm.ids.length === 1 ? "usuario" : `${memberDeleteConfirm.ids.length} usuarios`}?</h3>
                  <p>
                    {memberDeleteConfirm.ids.length === 1
                      ? `Se eliminará "${memberDeleteConfirm.name}" y todos sus datos asociados. Esta acción no se puede deshacer.`
                      : `Se eliminarán ${memberDeleteConfirm.ids.length} usuarios y todos sus datos asociados. Esta acción no se puede deshacer.`}
                  </p>
                  <div className="admin-members-confirm-actions">
                    <button type="button" className="secondary-btn" disabled={isMemberDeleting} onClick={() => setMemberDeleteConfirm(null)}>
                      Cancelar
                    </button>
                    <button type="button" className="admin-members-confirm-delete-btn" disabled={isMemberDeleting} onClick={confirmDeleteMembers}>
                      {isMemberDeleting ? "Eliminando…" : "Eliminar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : activeSection === "Administradores" ? (
          <>
            <p className="subtitle">Usuarios con rol administrador.</p>

            <section className="admin-people-section" aria-label="Administradores">
              <article className="admin-people-card" aria-label="Administradores registrados">
                <div className="admin-people-card-header">
                  <h3>Administradores</h3>
                  <strong>{administratorsCount}</strong>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table admin-people-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Mail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {administrators.length ? administrators.map((adminUser) => (
                        <tr key={`admin-${adminUser.id}`}>
                          <td>{adminUser.name || "Sin nombre"}</td>
                          <td>{adminUser.email || "-"}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={2}>No hay administradores cargados todavía.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          </>
        ) : activeSection === "Analíticas" ? (
          <>
            <p className="subtitle">Panel avanzado de tráfico web con sesiones, fuentes, embudos y comportamiento de navegación.</p>

            <div className="admin-analytics-toolbar">
              <label className="admin-analytics-toolbar-field">
                <span>Rango</span>
                <AnalyticsDatePicker
                  value={analyticsPeriod}
                  disabled={isAnalyticsLoading || isReloadingAnalytics}
                  onChange={async (selection) => {
                    if (selection.preset) {
                      setAnalyticsPeriod(selection.preset);
                      setAnalyticsDateRange(null);
                      await handleAnalyticsReload(selection.preset);
                    } else {
                      setAnalyticsPeriod(null);
                      setAnalyticsDateRange({ from: selection.from, to: selection.to });
                      await handleAnalyticsReload({ from: selection.from, to: selection.to });
                    }
                  }}
                />
              </label>

              <button
                type="button"
                className="admin-inventory-filter-btn"
                onClick={() => {
                  if (analyticsDateRange) {
                    handleAnalyticsReload(analyticsDateRange);
                  } else {
                    handleAnalyticsReload(analyticsPeriod);
                  }
                }}
                disabled={isAnalyticsLoading || isReloadingAnalytics}
              >
                {isAnalyticsLoading || isReloadingAnalytics ? "Actualizando..." : "Actualizar métricas"}
              </button>

              <button
                type="button"
                className="admin-user-activity-btn"
                onClick={handleOpenUserActivity}
                disabled={isAnalyticsLoading || isReloadingAnalytics}
              >
                <span className="admin-user-activity-btn-icon">👁️</span>
                Ver actividad de usuarios
              </button>
            </div>

            {!analytics ? (
              <p className="admin-categories-empty">Todavía no hay datos de analíticas para mostrar.</p>
            ) : (
              <>
                <section className="admin-analytics-live-strip" aria-live="polite">
                  <div className="admin-analytics-live-dot" aria-hidden="true" />
                  <div className="admin-analytics-live-main">
                    <strong>{formatAnalyticsNumber(analyticsSummary.liveVisitors ?? analyticsSummary.liveSessions)}</strong>
                    <span>visitantes activos en este momento</span>
                  </div>
                  <p>Actividad en ventana en vivo de 5 minutos</p>
                </section>

                <section className="admin-analytics-key-stats">
                  <header className="admin-analytics-key-stats-header">
                    <h3>Estadísticas clave</h3>
                    <div className="admin-analytics-key-actions">
                      <button type="button" className="admin-analytics-key-action-btn">Crear alerta</button>
                      <button type="button" className="admin-analytics-key-action-btn">Agregar estadísticas</button>
                    </div>
                  </header>

                  <div className="admin-analytics-key-grid">
                    <article className="admin-analytics-key-card">
                      <h4>Sesiones del sitio</h4>
                      <div className="admin-analytics-key-value-row">
                        <strong>{formatAnalyticsNumber(analyticsSummary.sessions)}</strong>
                        <span>{formatAnalyticsPercent(analyticsComparison.sessionsPct)}</span>
                      </div>
                      <p>{formatAnalyticsNumber(analyticsSummary.sessionsToday)} hoy • {formatAnalyticsNumber(analyticsSummary.sessionsYesterday)} ayer</p>
                      <svg viewBox="0 0 120 34" className="admin-analytics-key-sparkline" aria-hidden="true">
                        <polyline points={sessionsSparklinePoints} />
                      </svg>
                    </article>

                    <article className="admin-analytics-key-card">
                      <h4>Visitantes únicos</h4>
                      <div className="admin-analytics-key-value-row">
                        <strong>{formatAnalyticsNumber(analyticsSummary.uniqueVisitors)}</strong>
                        <span>{formatAnalyticsPercent(analyticsComparison.uniqueVisitorsPct)}</span>
                      </div>
                      <p>{formatAnalyticsNumber(analyticsSummary.visitorsToday)} hoy • {formatAnalyticsNumber(analyticsSummary.visitorsYesterday)} ayer</p>
                      <svg viewBox="0 0 120 34" className="admin-analytics-key-sparkline" aria-hidden="true">
                        <polyline points={visitorsSparklinePoints} />
                      </svg>
                    </article>

                    <article className="admin-analytics-key-card">
                      <h4>Clics totales</h4>
                      <div className="admin-analytics-key-value-row">
                        <strong>{formatAnalyticsNumber(analyticsSummary.totalClicks)}</strong>
                        <span>{formatAnalyticsPercent(analyticsComparison.clicksPct)}</span>
                      </div>
                      <p>{formatAnalyticsNumber(analyticsSummary.clicksToday)} hoy • {formatAnalyticsNumber(analyticsSummary.clicksYesterday)} ayer</p>
                      <svg viewBox="0 0 120 34" className="admin-analytics-key-sparkline" aria-hidden="true">
                        <polyline points={clicksSparklinePoints} />
                      </svg>
                    </article>
                  </div>
                </section>

                <section className="admin-traffic-origin">
                  <header className="admin-traffic-origin-header">
                    <h3>Conoce a tus visitantes</h3>
                    <button type="button" className="admin-traffic-origin-cta">Ir a Resumen del tráfico</button>
                  </header>

                  <div className="admin-traffic-origin-grid">
                    <article className="admin-traffic-origin-card">
                      <h4>Sesiones a lo largo del tiempo</h4>
                      <div className="admin-traffic-timeline-wrap">
                        <svg viewBox="0 0 620 220" className="admin-traffic-timeline" aria-hidden="true">
                          <line x1="0" y1="220" x2="620" y2="220" className="axis" />
                          <line x1="0" y1="146" x2="620" y2="146" className="grid" />
                          <line x1="0" y1="74" x2="620" y2="74" className="grid" />
                          {timelineAreaPath && <path d={timelineAreaPath} className="area" />}
                          {timelinePolyline && <polyline points={timelinePolyline} className="line" />}
                        </svg>
                        <div className="admin-traffic-timeline-labels">
                          <span>{timelineStartLabel}</span>
                          <span>{timelineMiddleLabel}</span>
                          <span>{timelineEndLabel}</span>
                        </div>
                      </div>
                    </article>

                    <article className="admin-traffic-origin-card admin-traffic-origin-card--sources">
                      <h4>Principales fuentes de tráfico</h4>
                      <ul className="admin-traffic-source-list">
                        {featuredTrafficSources.map((item) => {
                          const sessionsValue = Number(item.sessions || 0);
                          const width = maxSourceSessions > 0 ? (sessionsValue / maxSourceSessions) * 100 : 0;
                          const deltaValue = Number(item.deltaPct || 0);
                          const isPositive = deltaValue >= 0;
                          const sourceLabel = item.displayLabel || formatTrafficSourceName(item.source);
                          const channelLabel = item.displayLabel ? "" : formatTrafficChannelLabel(item.channel);

                          return (
                            <li key={`source-performance-${item.key || item.source}`}>
                              <div className="admin-traffic-source-row">
                                <strong>{channelLabel ? `${sourceLabel} (${channelLabel})` : sourceLabel}</strong>
                                <div className="admin-traffic-source-meta">
                                  <span className={`admin-traffic-source-delta ${isPositive ? "is-positive" : "is-negative"}`}>
                                    {isPositive ? "↑" : "↓"} {Math.abs(deltaValue).toFixed(0)}%
                                  </span>
                                  <span className="admin-traffic-source-count">{formatAnalyticsNumber(sessionsValue)}</span>
                                </div>
                              </div>
                              <div className="admin-traffic-source-track">
                                <span className="admin-traffic-source-fill" style={{ width: `${Math.max(0, Math.min(100, width))}%` }} />
                              </div>
                            </li>
                          );
                        })}
                        {!featuredTrafficSources.length && (
                          <li>
                            <div className="admin-traffic-source-row">
                              <strong>Sin fuentes registradas</strong>
                            </div>
                            <div className="admin-traffic-source-track" />
                          </li>
                        )}
                      </ul>
                      <button type="button" className="admin-traffic-source-link">Ver informe</button>
                    </article>

                    <article className="admin-traffic-origin-card">
                      <h4>Canales y campañas</h4>
                      <div className="admin-traffic-mini-grid">
                        <section>
                          <h5>Medios</h5>
                          <ul className="admin-analytics-kpi-list">
                            {topMediums.map((item) => (
                              <li key={`medium-${item.medium}`}>
                                <span>{item.medium}</span>
                                <strong>{formatAnalyticsNumber(item.sessions)}</strong>
                              </li>
                            ))}
                          </ul>
                        </section>

                        <section>
                          <h5>Campañas</h5>
                          <ul className="admin-analytics-kpi-list">
                            {topCampaigns.map((item) => (
                              <li key={`campaign-${item.campaign}`}>
                                <span>{item.campaign}</span>
                                <strong>{formatAnalyticsNumber(item.sessions)}</strong>
                              </li>
                            ))}
                          </ul>
                        </section>
                      </div>
                    </article>
                  </div>
                </section>

                <div className="admin-analytics-metrics-grid">
                  <article className="admin-analytics-metric-card">
                    <h3>Page views</h3>
                    <strong>{formatAnalyticsNumber(analyticsSummary.pageViews)}</strong>
                    <p>{formatAnalyticsPercent(analyticsComparison.pageViewsPct)} vs período anterior</p>
                  </article>
                  <article className="admin-analytics-metric-card">
                    <h3>Visitantes únicos</h3>
                    <strong>{formatAnalyticsNumber(analyticsSummary.uniqueVisitors)}</strong>
                    <p>{formatAnalyticsPercent(analyticsComparison.uniqueVisitorsPct)} vs período anterior</p>
                  </article>
                  <article className="admin-analytics-metric-card">
                    <h3>Sesiones</h3>
                    <strong>{formatAnalyticsNumber(analyticsSummary.sessions)}</strong>
                    <p>{formatAnalyticsPercent(analyticsComparison.sessionsPct)} vs período anterior</p>
                  </article>
                  <article className="admin-analytics-metric-card">
                    <h3>Sesiones online</h3>
                    <strong>{formatAnalyticsNumber(analyticsSummary.liveSessions)}</strong>
                    <p>Ventana en vivo de 5 minutos</p>
                  </article>
                  <article className="admin-analytics-metric-card">
                    <h3>Rebote</h3>
                    <strong>{formatAnalyticsPercent(analyticsSummary.bounceRate)}</strong>
                    <p>Sesiones de una sola página</p>
                  </article>
                  <article className="admin-analytics-metric-card">
                    <h3>Duración promedio</h3>
                    <strong>{formatAnalyticsDuration(analyticsSummary.avgSessionDurationSeconds)}</strong>
                    <p>{Number(analyticsSummary.avgPagesPerSession || 0).toFixed(2)} páginas por sesión</p>
                  </article>
                  <article className="admin-analytics-metric-card">
                    <h3>Pedidos</h3>
                    <strong>{formatAnalyticsNumber(analyticsSummary.orders)}</strong>
                    <p>Conversión {formatAnalyticsPercent(analyticsSummary.conversionRate)}</p>
                  </article>
                  <article className="admin-analytics-metric-card">
                    <h3>Facturación</h3>
                    <strong>{formatOrderCurrency(analyticsSummary.revenue, "ARS")}</strong>
                    <p>Ticket promedio {formatOrderCurrency(analyticsSummary.avgOrderValue, "ARS")}</p>
                  </article>
                  <article className="admin-analytics-metric-card">
                    <h3>Usuarios recurrentes</h3>
                    <strong>{formatAnalyticsNumber(analyticsSummary.returningVisitors)}</strong>
                    <p>Visitantes con más de una visita histórica</p>
                  </article>
                </div>

                <div className="admin-analytics-grid-two">
                  <section className="admin-analytics-card">
                    <h3>Sesiones a lo largo del tiempo</h3>
                    <div className="admin-analytics-bars-list">
                      {analyticsDaily.map((item) => {
                        const value = Number(item.pageViews || 0);
                        const width = maxDailyPageViews > 0 ? (value / maxDailyPageViews) * 100 : 0;

                        return (
                          <div key={`day-${item.day}`} className="admin-analytics-bar-row">
                            <span className="admin-analytics-bar-label">{formatAnalyticsDay(item.day)}</span>
                            <div className="admin-analytics-bar-track">
                              <span className="admin-analytics-bar-fill" style={{ width: `${Math.max(2, width)}%` }} />
                            </div>
                            <strong>{formatAnalyticsNumber(value)}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="admin-analytics-card">
                    <h3>Tráfico por hora</h3>
                    <div className="admin-analytics-bars-list">
                      {analyticsHourly.map((item) => {
                        const value = Number(item.pageViews || 0);
                        const width = maxHourlyPageViews > 0 ? (value / maxHourlyPageViews) * 100 : 0;

                        return (
                          <div key={`hour-${item.hour}`} className="admin-analytics-bar-row">
                            <span className="admin-analytics-bar-label">{String(item.hour).padStart(2, "0")}:00</span>
                            <div className="admin-analytics-bar-track">
                              <span className="admin-analytics-bar-fill is-hour" style={{ width: `${Math.max(2, width)}%` }} />
                            </div>
                            <strong>{formatAnalyticsNumber(value)}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <section className="admin-analytics-card">
                  <h3>Mapa semanal (día/hora)</h3>
                  <div className="admin-analytics-heatmap">
                    <div className="admin-analytics-heatmap-row admin-analytics-heatmap-header">
                      <span className="admin-analytics-heatmap-day" />
                      <div className="admin-analytics-heatmap-hours">
                        {Array.from({ length: 24 }, (_, h) => (
                          <span key={`h-label-${h}`} className="admin-analytics-heatmap-hour-label">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                    {Array.from({ length: 7 }, (_, index) => index + 1).map((weekday) => (
                      <div key={`weekday-${weekday}`} className="admin-analytics-heatmap-row">
                        <span className="admin-analytics-heatmap-day">{weekdayLabel(weekday)}</span>
                        <div className="admin-analytics-heatmap-hours">
                          {Array.from({ length: 24 }, (_, hour) => {
                            const value = analyticsHeatmapMap.get(`${weekday}-${hour}`) || 0;
                            const intensity = maxHeatmapPageViews > 0 ? value / maxHeatmapPageViews : 0;

                            return (
                              <span
                                key={`heat-${weekday}-${hour}`}
                                className="admin-analytics-heatmap-cell"
                                title={`${weekdayLabel(weekday)} ${String(hour).padStart(2, "0")}:00 · ${formatAnalyticsNumber(value)} views`}
                                style={{ opacity: Math.max(0.08, intensity) }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="admin-analytics-grid-four">
                  <section className="admin-analytics-card">
                    <h3>Top páginas</h3>
                    <ul className="admin-analytics-kpi-list">
                      {(analyticsBreakdown.topPages || []).map((item) => (
                        <li key={`page-${item.path}`}>
                          <span>{normalizeAnalyticsPath(item.path)}</span>
                          <strong>{formatAnalyticsNumber(item.views)}</strong>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="admin-analytics-card">
                    <h3>Páginas de entrada</h3>
                    <ul className="admin-analytics-kpi-list">
                      {(analyticsBreakdown.entryPages || []).map((item) => (
                        <li key={`entry-${item.path}`}>
                          <span>{normalizeAnalyticsPath(item.path)}</span>
                          <strong>{formatAnalyticsNumber(item.sessions)}</strong>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="admin-analytics-card">
                    <h3>Fuentes principales</h3>
                    <ul className="admin-analytics-kpi-list">
                      {(analyticsBreakdown.sources || []).map((item) => (
                        <li key={`source-${item.source}`}>
                          <span>{item.source}</span>
                          <strong>{formatAnalyticsNumber(item.sessions)}</strong>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="admin-analytics-card">
                    <h3>Referencias</h3>
                    <ul className="admin-analytics-kpi-list">
                      {(analyticsBreakdown.referrers || []).map((item) => (
                        <li key={`referrer-${item.referrer}`}>
                          <span>{item.referrer}</span>
                          <strong>{formatAnalyticsNumber(item.visits)}</strong>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <div className="admin-analytics-grid-three">
                  <section className="admin-analytics-card admin-analytics-devices-card">
                    <h3>Sesiones por dispositivo</h3>
                    <div className="admin-analytics-devices-body">
                      <div
                        className="admin-analytics-devices-donut"
                        style={{
                          background: deviceChartGradient
                            ? `conic-gradient(${deviceChartGradient})`
                            : "conic-gradient(var(--blue) 0deg 360deg)"
                        }}
                      >
                        <div className="admin-analytics-devices-donut-center">
                          <span>Sesiones del sitio</span>
                          <strong>{formatAnalyticsNumber(devicesTotal)}</strong>
                        </div>
                      </div>

                      <ul className="admin-analytics-devices-legend">
                        {devicesBreakdown.map((item, index) => (
                          <li key={`device-${item.device}-${index}`}>
                            <span
                              className="admin-analytics-devices-dot"
                              style={{ background: deviceChartColors[index % deviceChartColors.length] }}
                              aria-hidden="true"
                            />
                            <div>
                              <strong>{item.label}</strong>
                              <p>
                                <strong>{formatAnalyticsShare(item.sessions, devicesTotal).replace("%", " %")}</strong>
                                <span>•</span>
                                <span>{formatAnalyticsNumber(item.sessions)}</span>
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button type="button" className="admin-analytics-devices-link">
                      Ver informe
                    </button>
                  </section>

                  <section className="admin-analytics-card admin-analytics-devices-card">
                    <h3>Navegadores</h3>
                    <div className="admin-analytics-devices-body">
                      <div
                        className="admin-analytics-devices-donut"
                        style={{
                          background: browsersChartGradient
                            ? `conic-gradient(${browsersChartGradient})`
                            : "conic-gradient(var(--blue) 0deg 360deg)"
                        }}
                      >
                        <div className="admin-analytics-devices-donut-center">
                          <span>Sesiones del sitio</span>
                          <strong>{formatAnalyticsNumber(browsersTotal)}</strong>
                        </div>
                      </div>

                      <ul className="admin-analytics-devices-legend">
                        {browsersBreakdown.map((item, index) => (
                          <li key={`browser-${item.browser}-${index}`}>
                            <span
                              className="admin-analytics-devices-dot"
                              style={{ background: deviceChartColors[index % deviceChartColors.length] }}
                              aria-hidden="true"
                            />
                            <div>
                              <strong>{item.label}</strong>
                              <p>
                                <strong>{formatAnalyticsShare(item.sessions, browsersTotal).replace("%", " %")}</strong>
                                <span>•</span>
                                <span>{formatAnalyticsNumber(item.sessions)}</span>
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <section className="admin-analytics-card admin-analytics-devices-card">
                    <h3>Sistemas operativos</h3>
                    <div className="admin-analytics-devices-body">
                      <div
                        className="admin-analytics-devices-donut"
                        style={{
                          background: operatingSystemsChartGradient
                            ? `conic-gradient(${operatingSystemsChartGradient})`
                            : "conic-gradient(var(--blue) 0deg 360deg)"
                        }}
                      >
                        <div className="admin-analytics-devices-donut-center">
                          <span>Sesiones del sitio</span>
                          <strong>{formatAnalyticsNumber(operatingSystemsTotal)}</strong>
                        </div>
                      </div>

                      <ul className="admin-analytics-devices-legend">
                        {operatingSystemsBreakdown.map((item, index) => (
                          <li key={`os-${item.os}-${index}`}>
                            <span
                              className="admin-analytics-devices-dot"
                              style={{ background: deviceChartColors[index % deviceChartColors.length] }}
                              aria-hidden="true"
                            />
                            <div>
                              <strong>{item.label}</strong>
                              <p>
                                <strong>{formatAnalyticsShare(item.sessions, operatingSystemsTotal).replace("%", " %")}</strong>
                                <span>•</span>
                                <span>{formatAnalyticsNumber(item.sessions)}</span>
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </div>

                <div className="admin-analytics-grid-two">
                  <section className="admin-analytics-card">
                    <h3>Palabras más buscadas</h3>
                    <ul className="admin-analytics-kpi-list">
                      {topSearchTermsBreakdown.map((item) => (
                        <li key={`search-term-${item.term}`}>
                          <span>{item.term}</span>
                          <strong>{formatAnalyticsNumber(item.searches)}</strong>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="admin-analytics-card">
                    <h3>Categorías más seleccionadas</h3>
                    <ul className="admin-analytics-kpi-list">
                      {topSelectedCategoriesBreakdown.map((item) => (
                        <li key={`selected-category-${item.category}`}>
                          <span>{item.category}</span>
                          <strong>{formatAnalyticsNumber(item.selections)}</strong>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <section className="admin-analytics-card">
                  <h3>Eventos recientes</h3>
                  <div className="admin-table-wrap">
                    <table className="admin-table admin-analytics-events-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Evento</th>
                          <th>Página</th>
                          <th>Fuente</th>
                          <th>Dispositivo</th>
                          <th>Navegador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsRecentEvents.map((eventItem, index) => (
                          <tr key={`${eventItem.at}-${eventItem.eventType}-${index}`}>
                            <td>{formatCustomerDateTime(eventItem.at)}</td>
                            <td>{eventItem.eventType}</td>
                            <td>{normalizeAnalyticsPath(eventItem.path)}</td>
                            <td>{eventItem.source || "directo"}</td>
                            <td>{eventItem.deviceType || "-"}</td>
                            <td>{eventItem.browserName || "-"}</td>
                          </tr>
                        ))}
                        {!analyticsRecentEvents.length && (
                          <tr>
                            <td colSpan={6}>No hay eventos recientes para mostrar.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {isUserActivityOpen && (
                  <div className="admin-user-activity-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setIsUserActivityOpen(false); setExpandedSessionId(null); } }}>
                    <div className="admin-user-activity-panel">
                      <header className="admin-user-activity-header">
                        <div className="admin-user-activity-header-left">
                          <h2>Actividad de Usuarios</h2>
                          <p>Movimientos detallados por sesión con línea de tiempo de acciones</p>
                        </div>
                        <div className="admin-user-activity-header-actions">
                          <div className="admin-user-activity-filter-dropdown" ref={userActivityFilterRef}>
                            <button
                              type="button"
                              className="admin-user-activity-filter-trigger"
                              onClick={() => setIsUserActivityFilterOpen((o) => !o)}
                            >
                              <span>{userActivityFilter === "all" ? "👥 Todos los usuarios" : userActivityFilter === "logged_in" ? "🔐 Solo logueados" : "👤 Solo anónimos"}</span>
                              <span className={`admin-user-activity-filter-arrow${isUserActivityFilterOpen ? " is-open" : ""}`}>▾</span>
                            </button>
                            {isUserActivityFilterOpen && (
                              <div className="admin-user-activity-filter-menu">
                                {[
                                  { value: "all", label: "Todos los usuarios", icon: "👥" },
                                  { value: "logged_in", label: "Solo logueados", icon: "🔐" },
                                  { value: "anonymous", label: "Solo anónimos", icon: "👤" }
                                ].map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    className={`admin-user-activity-filter-option${userActivityFilter === opt.value ? " is-active" : ""}`}
                                    onClick={() => { setUserActivityFilter(opt.value); setIsUserActivityFilterOpen(false); }}
                                  >
                                    <span className="admin-user-activity-filter-option-icon">{opt.icon}</span>
                                    <span>{opt.label}</span>
                                    {userActivityFilter === opt.value && <span className="admin-user-activity-filter-check">✓</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button type="button" className="admin-user-activity-refresh-btn" onClick={handleRefreshUserActivity} disabled={isUserActivityLoading}>
                            {isUserActivityLoading ? "Cargando..." : "Actualizar"}
                          </button>
                          <button type="button" className="admin-user-activity-close-btn" onClick={() => { setIsUserActivityOpen(false); setExpandedSessionId(null); }}>✕</button>
                        </div>
                      </header>

                      {isUserActivityLoading && !userActivityData ? (
                        <div className="admin-user-activity-loading">
                          <div className="admin-user-activity-spinner" />
                          <p>Cargando sesiones de usuario...</p>
                        </div>
                      ) : !userActivityData ? (
                        <p className="admin-user-activity-empty">No se pudieron cargar los datos de actividad.</p>
                      ) : (
                        <>
                          <div className="admin-user-activity-summary-grid">
                            <article className="admin-user-activity-summary-card">
                              <span className="admin-user-activity-summary-icon">📊</span>
                              <div>
                                <strong>{formatAnalyticsNumber(userActivityData.summary?.totalSessions || 0)}</strong>
                                <span>Sesiones totales</span>
                              </div>
                            </article>
                            <article className="admin-user-activity-summary-card">
                              <span className="admin-user-activity-summary-icon">🔐</span>
                              <div>
                                <strong>{formatAnalyticsNumber(userActivityData.summary?.loggedInSessions || 0)}</strong>
                                <span>Sesiones logueadas</span>
                              </div>
                            </article>
                            <article className="admin-user-activity-summary-card">
                              <span className="admin-user-activity-summary-icon">👤</span>
                              <div>
                                <strong>{formatAnalyticsNumber(userActivityData.summary?.anonymousSessions || 0)}</strong>
                                <span>Sesiones anónimas</span>
                              </div>
                            </article>
                            <article className="admin-user-activity-summary-card">
                              <span className="admin-user-activity-summary-icon">⏱️</span>
                              <div>
                                <strong>{formatAnalyticsDuration(userActivityData.summary?.avgDurationSeconds || 0)}</strong>
                                <span>Duración promedio</span>
                              </div>
                            </article>
                            <article className="admin-user-activity-summary-card">
                              <span className="admin-user-activity-summary-icon">🛒</span>
                              <div>
                                <strong>{formatAnalyticsNumber(userActivityData.summary?.totalCartAdds || 0)}</strong>
                                <span>Agregados al carrito</span>
                              </div>
                            </article>
                            <article className="admin-user-activity-summary-card">
                              <span className="admin-user-activity-summary-icon">👁️</span>
                              <div>
                                <strong>{formatAnalyticsNumber(userActivityData.summary?.totalProductViews || 0)}</strong>
                                <span>Productos vistos</span>
                              </div>
                            </article>
                            <article className="admin-user-activity-summary-card">
                              <span className="admin-user-activity-summary-icon">💳</span>
                              <div>
                                <strong>{formatAnalyticsNumber(userActivityData.summary?.totalCheckouts || 0)}</strong>
                                <span>Inicios de checkout</span>
                              </div>
                            </article>
                          </div>

                          {(() => {
                            const allSessions = userActivityData.sessions || [];
                            const filteredCount = allSessions.filter((s) => {
                              if (userActivityFilter === "logged_in") return s.isLoggedIn;
                              if (userActivityFilter === "anonymous") return !s.isLoggedIn;
                              return true;
                            }).length;
                            return (
                              <div className="admin-user-activity-sessions-count">
                                Mostrando <strong>{filteredCount}</strong> de {allSessions.length} sesiones
                                {userActivityFilter !== "all" && (
                                  <button type="button" className="admin-user-activity-show-all-btn" onClick={() => setUserActivityFilter("all")}>
                                    Ver todas
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                          <div className="admin-user-activity-sessions-list">
                            {(userActivityData.sessions || [])
                              .filter((session) => {
                                if (userActivityFilter === "logged_in") return session.isLoggedIn;
                                if (userActivityFilter === "anonymous") return !session.isLoggedIn;
                                return true;
                              })
                              .map((session, sessionIndex) => {
                                const isExpanded = expandedSessionId === session.sessionId;
                                const shortVisitorId = session.visitorId ? session.visitorId.slice(-6).toUpperCase() : "???";
                                return (
                                  <article
                                    key={`${session.sessionId}-${sessionIndex}`}
                                    className={`admin-user-activity-session-card${isExpanded ? " is-expanded" : ""}`}
                                  >
                                    <div
                                      className="admin-user-activity-session-header"
                                      onClick={() => setExpandedSessionId(isExpanded ? null : session.sessionId)}
                                    >
                                      <div className="admin-user-activity-session-row1">
                                        <div className="admin-user-activity-session-user">
                                          <span className={`admin-user-activity-session-badge${session.isLoggedIn ? " is-logged-in" : " is-anonymous"}`}>
                                            {session.isLoggedIn ? "🔐" : "👤"}
                                          </span>
                                          <div className="admin-user-activity-session-user-info">
                                            <strong>
                                              {session.isLoggedIn
                                                ? (session.userName || session.userEmail || `Usuario #${session.userId}`)
                                                : `Visitante #${shortVisitorId}`}
                                            </strong>
                                            {session.isLoggedIn && session.userEmail && (
                                              <span className="admin-user-activity-session-email">{session.userEmail}</span>
                                            )}
                                            {!session.isLoggedIn && (
                                              <span className="admin-user-activity-session-email">
                                                {session.source && session.source !== "directo" ? `vía ${session.source}` : "visita directa"} · {session.osName || ""}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="admin-user-activity-session-meta">
                                          <span className="admin-user-activity-session-meta-item" title="Dispositivo">
                                            {session.deviceType === "mobile" ? "📱" : session.deviceType === "tablet" ? "📟" : "💻"} {session.browserName}
                                          </span>
                                          <span className="admin-user-activity-session-meta-item" title="Duración">
                                            ⏱️ {formatAnalyticsDuration(session.durationSeconds)}
                                          </span>
                                          <span className="admin-user-activity-session-meta-item" title="Eventos">
                                            📈 {session.totalEvents} eventos
                                          </span>
                                          <span className="admin-user-activity-session-meta-item" title="Fecha">
                                            📅 {formatCustomerDateTime(session.sessionStart)}
                                          </span>
                                        </div>
                                        <span className="admin-user-activity-session-chevron">{isExpanded ? "▲" : "▼"}</span>
                                      </div>

                                      {(session.pageViews > 0 || session.productViews > 0 || session.cartAdds > 0 || session.searches > 0 || session.checkouts > 0 || session.categorySelects > 0) && (
                                        <div className="admin-user-activity-session-row2">
                                          {session.pageViews > 0 && <span className="admin-user-activity-action-pill pv">👁️ {session.pageViews} vistas</span>}
                                          {session.productViews > 0 && <span className="admin-user-activity-action-pill prod">🔍 {session.productViews} productos</span>}
                                          {session.cartAdds > 0 && <span className="admin-user-activity-action-pill cart">🛒 {session.cartAdds} al carrito</span>}
                                          {session.searches > 0 && <span className="admin-user-activity-action-pill search">🔎 {session.searches} búsquedas</span>}
                                          {session.checkouts > 0 && <span className="admin-user-activity-action-pill checkout">💳 {session.checkouts} checkout</span>}
                                          {session.categorySelects > 0 && <span className="admin-user-activity-action-pill cat">🗂️ {session.categorySelects} categorías</span>}
                                        </div>
                                      )}
                                    </div>

                                    {isExpanded && (
                                      <div className="admin-user-activity-timeline">
                                        <div className="admin-user-activity-timeline-line" />
                                        {(session.timeline || []).map((event, eventIndex) => (
                                          <div key={`${session.sessionId}-evt-${eventIndex}`} className="admin-user-activity-timeline-event">
                                            <div className={`admin-user-activity-timeline-dot ${event.eventType}`} />
                                            <div className="admin-user-activity-timeline-content">
                                              <div className="admin-user-activity-timeline-event-header">
                                                <span className="admin-user-activity-timeline-event-type">
                                                  {event.eventType === "page_view" ? "👁️ Vista de página"
                                                    : event.eventType === "product_view" ? "🔍 Vio producto"
                                                    : event.eventType === "add_to_cart" ? "🛒 Agregó al carrito"
                                                    : event.eventType === "remove_from_cart" ? "❌ Quitó del carrito"
                                                    : event.eventType === "open_cart" ? "🧺 Abrió carrito"
                                                    : event.eventType === "clear_cart" ? "🗑️ Vació carrito"
                                                    : event.eventType === "search" ? "🔎 Búsqueda"
                                                    : event.eventType === "category_select" ? "🗂️ Seleccionó categoría"
                                                    : event.eventType === "begin_checkout" ? "💳 Inició checkout"
                                                    : event.eventType === "login" ? "🔐 Inició sesión"
                                                    : event.eventType === "register" ? "✨ Se registró"
                                                    : `⚡ ${event.eventType}`}
                                                </span>
                                                <time className="admin-user-activity-timeline-time">
                                                  {new Date(event.at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                                </time>
                                              </div>
                                              <div className="admin-user-activity-timeline-details">
                                                {event.path && event.path !== "/" && (
                                                  <span className="admin-user-activity-timeline-path">📄 {normalizeAnalyticsPath(event.path)}</span>
                                                )}
                                                {event.metadata?.productName && (
                                                  <span className="admin-user-activity-timeline-product">🏷️ {event.metadata.productName}</span>
                                                )}
                                                {event.metadata?.query && (
                                                  <span className="admin-user-activity-timeline-search">"{event.metadata.query}"</span>
                                                )}
                                                {event.metadata?.categoryName && (
                                                  <span className="admin-user-activity-timeline-category">{event.metadata.categoryName}</span>
                                                )}
                                                {event.metadata?.quantity && (
                                                  <span className="admin-user-activity-timeline-qty">×{event.metadata.quantity}</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                        {(!session.timeline || session.timeline.length === 0) && (
                                          <p className="admin-user-activity-timeline-empty">No hay eventos detallados para esta sesión.</p>
                                        )}
                                      </div>
                                    )}
                                  </article>
                                );
                              })}
                            {(userActivityData.sessions || []).filter((session) => {
                              if (userActivityFilter === "logged_in") return session.isLoggedIn;
                              if (userActivityFilter === "anonymous") return !session.isLoggedIn;
                              return true;
                            }).length === 0 && (
                              <p className="admin-user-activity-empty">No hay sesiones para el filtro seleccionado.</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : activeSection === "Reportes" ? (
          <>
            <p className="subtitle">Vista ejecutiva de stock crítico y rendimiento comercial.</p>

            <div className="admin-reports-kpi-grid">
              <article className="admin-reports-kpi-card">
                <span>Total alertas</span>
                <strong>{reportSummary.totalAlerts}</strong>
              </article>
              <article className="admin-reports-kpi-card is-critical">
                <span>Sin stock</span>
                <strong>{reportSummary.outOfStock}</strong>
              </article>
              <article className="admin-reports-kpi-card is-warning">
                <span>Stock bajo</span>
                <strong>{reportSummary.lowStock}</strong>
              </article>
              <article className="admin-reports-kpi-card">
                <span>Unidades vendidas</span>
                <strong>{reportSummary.totalUnitsSold.toLocaleString("es-AR")}</strong>
              </article>
            </div>

            <section className="admin-analytics-card admin-reports-card">
              <div className="admin-reports-card-header">
                <div>
                  <h3>Alertas de stock</h3>
                  <p>Mostrando {filteredReportAlertRows.length} de {reportSummary.totalAlerts} alertas.</p>
                </div>
                <div className="admin-reports-header-actions">
                  <button type="button" className="admin-report-action-btn" onClick={() => setActiveSection("Inventario")}>
                    Gestionar inventario
                  </button>
                </div>
              </div>

              <div className="admin-reports-filters">
                <input
                  type="search"
                  placeholder="Buscar por producto o marca"
                  value={reportSearch}
                  onChange={(event) => setReportSearch(event.target.value)}
                  aria-label="Buscar alertas"
                />
                <select
                  value={reportAlertStatusFilter}
                  onChange={(event) => setReportAlertStatusFilter(event.target.value)}
                  aria-label="Filtrar por estado"
                >
                  <option value="all">Todos los estados</option>
                  <option value="out">Sin stock</option>
                  <option value="low">Stock bajo</option>
                </select>
                <select
                  value={reportAlertTypeFilter}
                  onChange={(event) => setReportAlertTypeFilter(event.target.value)}
                  aria-label="Filtrar por tipo"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="product">Producto</option>
                  <option value="variant">Variante</option>
                </select>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table admin-reports-alerts-table">
                  <thead>
                    <tr>
                      <th>Producto / Variante</th>
                      <th>Marca</th>
                      <th>Tipo</th>
                      <th>Stock</th>
                      <th>Mínimo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReportAlertRows.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.brand}</td>
                        <td>{item.type}</td>
                        <td>{item.stock}</td>
                        <td>{item.threshold}</td>
                        <td>
                          <span className={`admin-report-status-pill ${item.status === "out" ? "is-critical" : "is-warning"}`}>
                            {item.status === "out" ? "Sin stock" : "Stock bajo"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!filteredReportAlertRows.length && (
                      <tr>
                        <td colSpan={6}>No hay alertas para los filtros seleccionados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="admin-analytics-grid-two admin-reports-sales-grid">
              <section className="admin-analytics-card admin-reports-card">
                <div className="admin-reports-card-header">
                  <div>
                    <h3>Ventas por producto</h3>
                    <p>{reportSummary.productsWithSales.toLocaleString("es-AR")} productos con ventas registradas.</p>
                  </div>
                  <button type="button" className="admin-report-action-btn" onClick={() => setActiveSection("Productos")}>
                    Ver productos
                  </button>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Marca</th>
                        <th>Unidades</th>
                        <th>Ventas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesByProduct.map((item) => (
                        <tr key={`${item.productId}-${item.productName}`}>
                          <td>{item.productName}</td>
                          <td>{item.brand || "Sin marca"}</td>
                          <td>{Number(item.unitsSold || 0).toLocaleString("es-AR")}</td>
                          <td>{formatOrderCurrency(item.sales, "ARS")}</td>
                        </tr>
                      ))}
                      {!salesByProduct.length && (
                        <tr>
                          <td colSpan={4}>Todavía no hay ventas por producto para mostrar.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="admin-analytics-card admin-reports-card">
                <div className="admin-reports-card-header">
                  <div>
                    <h3>Ventas por marca</h3>
                    <p>Comparativo de performance comercial por marca.</p>
                  </div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Marca</th>
                        <th>Unidades</th>
                        <th>Ventas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesByBrand.map((item) => (
                        <tr key={item.brand}>
                          <td>{item.brand || "Sin marca"}</td>
                          <td>{Number(item.unitsSold || 0).toLocaleString("es-AR")}</td>
                          <td>{formatOrderCurrency(item.sales, "ARS")}</td>
                        </tr>
                      ))}
                      {!salesByBrand.length && (
                        <tr>
                          <td colSpan={3}>Todavía no hay ventas por marca para mostrar.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        ) : activeSection === "Tickets" ? (
          <TicketsPanel
            mode="admin"
            tickets={tickets}
            metrics={ticketMetrics}
            currentUser={null}
            onCreateTicket={onCreateTicket}
            onUpdateTicket={onUpdateTicket}
            onAddComment={onAddTicketComment}
            onCloseTicket={onCloseTicket}
            onDeleteTicket={onDeleteTicket}
            onReloadTickets={onReloadTickets}
            isLoading={isTicketsLoading}
          />
        ) : (
          <p className="subtitle">
            La sección <strong>{activeSection}</strong> está lista para implementar.
          </p>
        )}
      </div>

      {fulfillmentConfirmOrder && (
        <div
          className="admin-order-fulfillment-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!isSubmittingFulfillmentConfirm) {
              setFulfillmentConfirmOrder(null);
            }
          }}
        >
          <article
            className="admin-order-fulfillment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-order-fulfillment-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="admin-order-fulfillment-modal-title">Marcar pedido como cumplido</h3>
            <p>
              ¿Quieres marcar el pedido n.º {fulfillmentConfirmOrder.wixOrderNumber || fulfillmentConfirmOrder.id} como completado?
            </p>

            <label className="admin-order-fulfillment-modal-option">
              <input
                type="checkbox"
                checked={fulfillmentConfirmMarkPaid}
                onChange={(event) => setFulfillmentConfirmMarkPaid(event.target.checked)}
                disabled={isSubmittingFulfillmentConfirm}
              />
              <span>Marcar pedido como pagado</span>
            </label>

            <div className="admin-order-fulfillment-modal-option-row">
              <label className="admin-order-fulfillment-modal-option">
                <input
                  type="checkbox"
                  checked={fulfillmentConfirmSendReadyEmail}
                  onChange={(event) => setFulfillmentConfirmSendReadyEmail(event.target.checked)}
                  disabled={isSubmittingFulfillmentConfirm}
                />
                <span>Enviar email de pedido listo para ser retirado</span>
              </label>

              <button
                type="button"
                className="admin-order-fulfillment-modal-link"
                onClick={() => handleOrderQuickAction("preview_ready_email", fulfillmentConfirmOrder)}
                disabled={isSubmittingFulfillmentConfirm}
              >
                Previsualizar email
              </button>
            </div>

            <div className="admin-order-fulfillment-modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setFulfillmentConfirmOrder(null)}
                disabled={isSubmittingFulfillmentConfirm}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleOrderQuickAction("confirm_mark_completed", fulfillmentConfirmOrder)}
                disabled={isSubmittingFulfillmentConfirm}
              >
                {isSubmittingFulfillmentConfirm ? "Guardando..." : "Marcar como cumplido"}
              </button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
