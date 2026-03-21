import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  addTicketComment,
  applyPromotion,
  checkoutCart,
  closeTicket,
  createTicket,
  createAdminCategory,
  createProductVariant,
  createPromotion,
  createProduct,
  deleteAdminCategory,
  deleteMember,
  deleteMembersBulk,
  deleteTicket,
  ensureOrderInvoice,
  deleteProduct,
  deleteProductVariant,
  fetchAdminCategories,
  fetchAdminAnalytics,
  fetchAdministrators,
  fetchCustomerActivity,
  fetchCustomerReorderItems,
  fetchUserCart,
  fetchCustomersHistory,
  fetchMembers,
  fetchLowStockAlerts,
  fetchOrders,
  fetchMyOrders,
  fetchTicketMetrics,
  fetchTickets,
  fetchProductVariants,
  fetchPromotions,
  fetchSalesByBrand,
  fetchSalesByProduct,
  fetchProducts,
  fetchShippingRules,
  login,
  register,
  resendVerificationCode,
  verifyEmail,
  forgotPassword,
  resetPassword,
  activateWelcomeDiscount,
  quoteShipping,
  updateTicket,
  updateMyAddress,
  updateMyProfile,
  updateAdminCategory,
  updateOrderStatus,
  updateShippingRule,
  updateProduct,
  submitLegalTicket,
  saveUserCart,
  uploadProductMedia,
  trackAnalyticsEvent,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  syncDeliveryZone
} from "./api";

// Lazy-loaded heavy components (code splitting)
const AdminPanel = lazy(() => import("./components/AdminPanel"));
const AccountPanel = lazy(() => import("./components/AccountPanel"));
const LoginModal = lazy(() => import("./components/LoginModal"));
const SmartOrderPanel = lazy(() => import("./components/SmartOrderPanel"));
const WelcomeDiscountModal = lazy(() => import("./components/WelcomeDiscountModal"));

import { categoryDescendantsMap } from "./components/categoryTree";
import AddressSelector from "./components/AddressSelector";
import BrandsCarousel from "./components/BrandsCarousel";
import HomeBanners from "./components/HomeBanners";
import PromoStrip from "./components/PromoStrip";
import SiteHeader from "./components/SiteHeader";
import DeliveryCoverageSection from "./components/DeliveryCoverageSection";
import WelcomePromoSpotlight from "./components/WelcomePromoSpotlight";
import WelcomeDiscountTimer from "./components/WelcomeDiscountTimer";

const CATEGORY_PAGE_SIZE = 10;
const SEARCH_PAGE_SIZE = 10;
const RESULTS_SORT_OPTIONS = [
  { key: "recent", label: "Mas reciente", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { key: "price-desc", label: "Precios mas alto", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="4"/><polyline points="6 10 12 4 18 10"/></svg> },
  { key: "price-asc", label: "Precios mas bajo", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="4" x2="12" y2="20"/><polyline points="18 14 12 20 6 14"/></svg> },
  { key: "name-asc", label: "Nombre, creciente", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h10"/><path d="M3 12h7"/><path d="M3 18h4"/><path d="M18 6v12"/><polyline points="15 18 18 21 21 18"/></svg> },
  { key: "name-desc", label: "Nombre, decreciente", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h4"/><path d="M3 12h7"/><path d="M3 18h10"/><path d="M18 6v12"/><polyline points="15 6 18 3 21 6"/></svg> }
];
const RECENT_SEARCHES_STORAGE_KEY = "search:recent:queries";
const RECENT_SEARCHES_LIMIT = 6;
const ADDRESS_BOOK_STORAGE_PREFIX = "address-book";
const MAX_ACCOUNT_ADDRESSES = 5;
const WELCOME_PROMO_CODE = "PRIMERACOMPRA10";
const ADMIN_NOTIFICATIONS_SEEN_STORAGE_KEY = "admin:notifications:seen:v1";

function LazyFallback() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200, width: "100%" }}>
      <div className="lazy-spinner" />
    </div>
  );
}
const FREE_SHIPPING_TARGET_ARS = 50000;
const GUEST_CART_STORAGE_KEY = "cart:guest";
const CART_STORAGE_KEY = "cart:local";

const FOOTER_ACCOUNT_LINKS = [
  { key: "cuenta", label: "Mi Cuenta" },
  { key: "pedidos", label: "Mis Pedidos" },
  { key: "direccion", label: "Mi Dirección" },
  { key: "billetera", label: "Billetera" },
  { key: "favoritos", label: "Productos Favoritos" }
];

const FOOTER_CATEGORY_LINKS = [
  "Líquidos de Piso",
  "Suavizantes",
  "Insecticidas",
  "Plumeros",
  "Trapos",
  "Velas",
  "Saphirus",
  "Desinfectantes",
  "Lavandina",
  "Aromatizantes"
];

const FOOTER_INFO_LINKS = [
  { label: "Quienes Somos" },
  { label: "Defensa al consumidor", section: "consumer-defense" },
  { label: "Términos y Condiciones", section: "terms-conditions" },
  { label: "Políticas De Cambios y Devoluciones", section: "returns-exchanges" },
  { label: "Políticas De Envíos", section: "shipping-policies" },
  { label: "Datos Fiscales", section: "fiscal-data" },
  { label: "Libro de quejas", section: "complaints-book" },
  { label: "Información Comercial", section: "commercial-information" },
  { label: "Políticas De Privacidad", section: "privacy-policies" }
];

const INITIAL_COMPLAINT_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  orderNumber: "",
  reason: "",
  message: ""
};

const INITIAL_WITHDRAWAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  orderNumber: "",
  message: ""
};

const FOOTER_MOBILE_TABS = [
  { id: "contact", label: "Información" },
  { id: "account", label: "Mi Cuenta" },
  { id: "categories", label: "Categorías" },
  { id: "info", label: "Políticas de Privacidad y más" }
];

const HOME_FAQ_ITEMS = [
  {
    id: "why-choose-us",
    question: "¿Por qué elegirnos?",
    paragraphs: [
      "En otros lugares te venden productos. Nosotros te enseñamos a usarlos. Te asesoramos con soluciones personalizadas para cada necesidad de limpieza.",
      "¿Un problema de limpieza difícil? Te guiamos paso a paso."
    ]
  },
  {
    id: "expectations",
    question: "¿Qué pasa si el producto no cumple con mis expectativas?",
    paragraphs: ["Aceptamos devoluciones hasta los próximos 10 días de tu compra."]
  },
  {
    id: "shipping-cost",
    question: "¿Cuánto cuesta el envío?",
    paragraphs: [
      "En CABA el envío cuesta $5.000 ARS y en GBA cuesta $7.000 ARS. Todos los pedidos que superen los $50.000 ARS tienen envío gratis."
    ]
  },
  {
    id: "store-pickup",
    question: "¿Puedo retirar mi pedido en el local?",
    paragraphs: [
      "¡Sí! Vení a nuestro local en Acevedo 200, esq Padilla, Villa Crespo (CABA) de Lunes a Viernes, 09:00 a 13:00 y de 15:00 a 19:00.",
      "Vas a tener la posibilidad de revisar tus productos antes de llevártelos."
    ]
  },
  {
    id: "shipping-time",
    question: "¿Cuánto tardan los envíos en llegar a mi domicilio?",
    paragraphs: [
      "Como máximo, tardarán 3 días hábiles (72hs). Nos estaremos comunicando con vos cuando tu pedido esté por ser entregado."
    ]
  },
  {
    id: "cancel-order",
    question: "¿Puedo cancelar mi pedido después de comprar?",
    paragraphs: [
      "Sí, podés solicitar la cancelación de tu pedido siempre y cuando aún no haya sido despachado. Para hacerlo, completá el formulario en la página “Cancelar Pedido” con tu número de orden y tus datos de contacto.",
      "Nuestro equipo revisará la solicitud y se comunicará con vos por email o WhatsApp para confirmarte el estado de la cancelación.",
      "En caso de que el pedido ya haya sido enviado, deberás gestionarlo como una devolución siguiendo nuestras políticas."
    ]
  }
];

const GOOGLE_REVIEWS_URL =
  "https://www.google.com/maps/place/La+boutique+de+la+limpieza/@-34.6017654,-58.4449405,15.38z/data=!4m8!3m7!1s0x95bcca0b7931a1d1:0x1e26299fc19f8d61!8m2!3d-34.5997954!4d-58.4429719!9m1!1b1!16s%2Fg%2F11c61hcmzy";

const HOME_GOOGLE_REVIEWS = [
  {
    author: "dylan de caso",
    rating: 5,
    when: "Hace 4 meses",
    text:
      "Hoy hice un pedido desde la pagina web para retirar en la tienda y funciono 10/10. Al llegar, el pedido estaba listo tal como me habian indicado. Ademas, la atencion de Griselda fue excelente: amable, rapida y muy profesional."
  },
  {
    author: "Vanina Varela",
    rating: 5,
    when: "Hace 4 meses",
    text:
      "Excelente atencion y muy buenos productos y precios. Lo recomiendo."
  },
  {
    author: "damian kouchoyan",
    rating: 5,
    when: "Hace 4 meses",
    text:
      "Excelente atencion, variedad de productos, super recomendable."
  },
  {
    author: "gaston costabella",
    rating: 5,
    when: "Hace 4 meses",
    text:
      "Hice un pedido online para retirar y fue una muy buena experiencia. Aproveche el 10% de descuento en la primera compra y funciono perfecto."
  },
  {
    author: "William Tamiche",
    rating: 5,
    when: "Hace 4 meses",
    text:
      "Excelente tienda, con mucha variedad de productos de limpieza y marcas de calidad. Muy buena atencion tambien."
  },
  {
    author: "Geronimo Loza",
    rating: 5,
    when: "Hace 4 meses",
    text:
      "Muy buena variedad de productos, encontre todo lo que necesitaba y un sitio web facil de usar."
  },
  {
    author: "J V",
    rating: 4,
    when: "Hace 5 anos",
    text:
      "Muy buena atencion, arregle todo por WhatsApp e hice la compra perfectamente. Muy buenos precios y variedad."
  }
];

function createClientAnalyticsId(prefix) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateStorageId(storageKey, useSessionStorage = false) {
  if (typeof window === "undefined") {
    return createClientAnalyticsId(useSessionStorage ? "sid" : "vid");
  }

  const storage = useSessionStorage ? window.sessionStorage : window.localStorage;

  try {
    const current = storage.getItem(storageKey);
    if (current) {
      return current;
    }

    const nextId = createClientAnalyticsId(useSessionStorage ? "sid" : "vid");
    storage.setItem(storageKey, nextId);
    return nextId;
  } catch {
    return createClientAnalyticsId(useSessionStorage ? "sid" : "vid");
  }
}

function getReferrerHost(referrer) {
  const safeReferrer = String(referrer || "").trim();
  if (!safeReferrer) {
    return "";
  }

  try {
    return new URL(safeReferrer).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSeoSlug(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProductSeoSlug(product) {
  const explicitSlug = String(product?.seo?.slug || "").trim();
  if (explicitSlug) {
    return explicitSlug;
  }

  const fromNameAndBrand = toSeoSlug(`${String(product?.name || "")} ${String(product?.brand || "")}`);
  if (fromNameAndBrand) {
    return fromNameAndBrand;
  }

  return String(product?.id || "").trim();
}

function normalizeOrthography(value) {
  return normalizeSearchText(value)
    .replace(/nv/g, "mb")
    .replace(/nb/g, "mb")
    .replace(/v/g, "b")
    .replace(/c(?=[ei])/g, "s")
    .replace(/z/g, "s")
    .replace(/ll/g, "y")
    .replace(/\s+/g, " ")
    .trim();
}

function toNameCase(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return "";
  }

  return normalized
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function levenshteinDistance(sourceValue, targetValue) {
  const source = String(sourceValue || "");
  const target = String(targetValue || "");

  if (source === target) {
    return 0;
  }

  if (!source.length) {
    return target.length;
  }

  if (!target.length) {
    return source.length;
  }

  const previousRow = Array.from({ length: target.length + 1 }, (_, index) => index);

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    let previousDiagonal = previousRow[0];
    previousRow[0] = sourceIndex;

    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const temp = previousRow[targetIndex];
      const substitutionCost = source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;

      previousRow[targetIndex] = Math.min(
        previousRow[targetIndex] + 1,
        previousRow[targetIndex - 1] + 1,
        previousDiagonal + substitutionCost
      );

      previousDiagonal = temp;
    }
  }

  return previousRow[target.length];
}

function getFuzzyMaxDistance(queryLength) {
  if (queryLength <= 4) {
    return 1;
  }

  if (queryLength <= 8) {
    return 2;
  }

  return 3;
}

function hasApproximateWordMatch(normalizedQuery, normalizedText) {
  if (!normalizedQuery || !normalizedText) {
    return false;
  }

  const queryLength = normalizedQuery.length;
  const maxDistance = getFuzzyMaxDistance(queryLength);
  const words = normalizedText.split(/\s+/).filter(Boolean);

  return words.some((word) => {
    if (word.includes(normalizedQuery)) {
      return true;
    }

    if (Math.abs(word.length - queryLength) > maxDistance) {
      return false;
    }

    return levenshteinDistance(normalizedQuery, word) <= maxDistance;
  });
}

function isFuzzySearchMatch(query, rawText) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedText = normalizeSearchText(rawText);

  if (!normalizedQuery || !normalizedText) {
    return false;
  }

  const normalizedOrthographicQuery = normalizeOrthography(normalizedQuery);
  const normalizedOrthographicText = normalizeOrthography(normalizedText);

  if (
    normalizedText.includes(normalizedQuery)
    || normalizedOrthographicText.includes(normalizedOrthographicQuery)
  ) {
    return true;
  }

  // Skip fuzzy matching for very short queries to avoid false positives
  if (normalizedQuery.length < 3) {
    return false;
  }

  return (
    hasApproximateWordMatch(normalizedQuery, normalizedText)
    || hasApproximateWordMatch(normalizedOrthographicQuery, normalizedOrthographicText)
  );
}

function getProductCategoriesForSearch(product) {
  if (!Array.isArray(product?.categories)) {
    return [];
  }

  return product.categories
    .map((category) => {
      if (typeof category === "string") {
        return String(category || "").trim();
      }

      return String(category?.name || "").trim();
    })
    .filter(Boolean);
}

const CATEGORY_FILTER_ALIASES = {
  aerosoles: ["aerosol", "aerosoles", "aerosol saphirus", "aerosoles saphirus"],
  aparatos: ["aparatos", "aparato", "aparatos saphirus", "aparato saphirus"],
  difusores: ["difusores", "difusor", "difusor saphirus"]
};

const CATEGORY_BRAND_CONSTRAINT = {
  aerosoles: "saphirus"
};

// Map from normalized parent category name → normalized descendant names (all levels)
const CATEGORY_PARENT_EXPANSIONS = Object.fromEntries(
  Array.from(categoryDescendantsMap.entries()).map(([key, values]) => [
    normalizeSearchText(key),
    values.map(normalizeSearchText)
  ])
);

function matchesSelectedCategory(productCategories, normalizedSelectedCategory) {
  if (!normalizedSelectedCategory) {
    return true;
  }

  const aliasTerms = CATEGORY_FILTER_ALIASES[normalizedSelectedCategory];

  if (Array.isArray(aliasTerms) && aliasTerms.length) {
    return productCategories.some((category) => aliasTerms.includes(category));
  }

  const expansionTerms = CATEGORY_PARENT_EXPANSIONS[normalizedSelectedCategory];

  if (Array.isArray(expansionTerms) && expansionTerms.length) {
    return productCategories.some((category) =>
      expansionTerms.some((term) => category.includes(term))
    );
  }

  return productCategories.some((category) => category.includes(normalizedSelectedCategory));
}

function getProductSearchableText(product) {
  const categoryText = getProductCategoriesForSearch(product).join(" ");
  const seoKeywordsText = Array.isArray(product?.seo?.keywords) ? product.seo.keywords.join(" ") : "";

  return [
    product?.name,
    product?.brand,
    product?.shortDescription,
    product?.longDescription,
    categoryText,
    product?.seo?.focusKeyword,
    seoKeywordsText
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function matchesProductSearch(product, query) {
  if (!query) {
    return true;
  }

  const queryWords = normalizeSearchText(query).split(/\s+/).filter(Boolean);

  if (queryWords.length <= 1) {
    return getProductSearchableText(product).some((text) => isFuzzySearchMatch(query, text));
  }

  const searchableTexts = getProductSearchableText(product);
  const combinedText = searchableTexts.join(" ");

  return queryWords.every((word) => isFuzzySearchMatch(word, combinedText));
}

function getSearchSuggestionScore(query, option) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedOption = normalizeSearchText(option);

  if (!normalizedQuery || !normalizedOption) {
    return Number.POSITIVE_INFINITY;
  }

  const normalizedOrthographicQuery = normalizeOrthography(normalizedQuery);
  const normalizedOrthographicOption = normalizeOrthography(normalizedOption);

  if (
    normalizedOption === normalizedQuery
    || normalizedOrthographicOption === normalizedOrthographicQuery
  ) {
    return 0;
  }

  if (
    normalizedOption.startsWith(normalizedQuery)
    || normalizedOrthographicOption.startsWith(normalizedOrthographicQuery)
  ) {
    return 1;
  }

  if (
    normalizedOption.includes(normalizedQuery)
    || normalizedOrthographicOption.includes(normalizedOrthographicQuery)
  ) {
    return 2;
  }

  if (
    hasApproximateWordMatch(normalizedQuery, normalizedOption)
    || hasApproximateWordMatch(normalizedOrthographicQuery, normalizedOrthographicOption)
  ) {
    return 3;
  }

  return Number.POSITIVE_INFINITY;
}

function extractWords(value) {
  return String(value || "")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];
}

function createAddressBookId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `addr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeAddressBookEntry(entry, fallbackId) {
  return {
    id: String(entry?.id || fallbackId || createAddressBookId()),
    street: String(entry?.street || "").trim(),
    height: String(entry?.height || "").trim(),
    floor: String(entry?.floor || "").trim(),
    apartment: String(entry?.apartment || "").trim(),
    city: String(entry?.city || "Buenos Aires").trim() || "Buenos Aires",
    region: String(entry?.region || "").trim(),
    country: "Argentina",
    postalCode: String(entry?.postalCode || "").trim(),
    phone: String(entry?.phone || "").trim()
  };
}

function buildAddressFromEntry(entry) {
  const normalizedEntry = normalizeAddressBookEntry(entry);
  const line = [normalizedEntry.street, normalizedEntry.height].filter(Boolean).join(" ").trim();

  return [
    line,
    normalizedEntry.floor ? `Piso ${normalizedEntry.floor}` : "",
    normalizedEntry.apartment ? `Depto ${normalizedEntry.apartment}` : "",
    normalizedEntry.city,
    normalizedEntry.region,
    normalizedEntry.postalCode ? `CP ${normalizedEntry.postalCode}` : "",
    "Argentina"
  ]
    .filter(Boolean)
    .join(", ");
}

function getAddressBookStorageKey(user) {
  const userId = String(user?.id || user?.email || "").trim();
  if (!userId) {
    return "";
  }

  return `${ADDRESS_BOOK_STORAGE_PREFIX}:${userId.toLowerCase()}`;
}

function readStoredAddressBook(user) {
  const storageKey = getAddressBookStorageKey(user);
  if (!storageKey || typeof window === "undefined") {
    return { addressBook: [], primaryAddressId: "" };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return { addressBook: [], primaryAddressId: "" };
    }

    const parsed = JSON.parse(raw);
    const parsedBook = Array.isArray(parsed?.addressBook)
      ? parsed.addressBook
      : (Array.isArray(parsed?.addresses) ? parsed.addresses : []);

    const addressBook = parsedBook
      .map((entry, index) => normalizeAddressBookEntry(entry, `addr-${index + 1}`))
      .filter((entry) => entry.street || entry.height)
      .slice(0, MAX_ACCOUNT_ADDRESSES);

    const primaryAddressId = String(parsed?.primaryAddressId || "").trim();

    return {
      addressBook,
      primaryAddressId
    };
  } catch {
    return { addressBook: [], primaryAddressId: "" };
  }
}

function formatAddressForMenu(address) {
  if (address && typeof address === "object") {
    const fromObject = [String(address.street || "").trim(), String(address.height || "").trim()]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fromObject) {
      return fromObject;
    }
  }

  const normalizedAddress = String(address || "").trim();

  if (!normalizedAddress) {
    return "";
  }

  const firstSegment = normalizedAddress
    .split(",")
    .map((part) => part.trim())
    .find(Boolean) || normalizedAddress;

  const lineMatch = firstSegment.match(/^(.*?\d+[\w\-/]*)/u);
  if (lineMatch?.[1]) {
    return lineMatch[1].trim();
  }

  const firstWordMatch = firstSegment.match(/[\p{L}]+/u);
  const firstNumberMatch = firstSegment.match(/\d+/);

  const firstWord = firstWordMatch?.[0] || "";
  const firstNumber = firstNumberMatch?.[0] || "";

  if (firstWord && firstNumber) {
    return `${firstWord} ${firstNumber}`;
  }

  return firstWord || firstNumber || firstSegment;
}

function buildSearchVocabulary(products) {
  const dictionary = new Map();

  for (const product of products || []) {
    if (product?.isVisible === false) {
      continue;
    }

    const searchableTextParts = getProductSearchableText(product);

    for (const text of searchableTextParts) {
      const words = extractWords(text);

      for (const word of words) {
        if (word.length < 3) {
          continue;
        }

        const normalizedWord = normalizeSearchText(word);

        if (!normalizedWord || normalizedWord.length < 3) {
          continue;
        }

        if (!dictionary.has(normalizedWord)) {
          dictionary.set(normalizedWord, {
            normalized: normalizedWord,
            orthographic: normalizeOrthography(normalizedWord),
            display: word
          });
        }
      }
    }
  }

  return Array.from(dictionary.values());
}

function getBestWordCorrection(queryWord, vocabulary) {
  const normalizedQueryWord = normalizeSearchText(queryWord);

  if (!normalizedQueryWord || normalizedQueryWord.length < 3) {
    return null;
  }

  const exactCandidate = vocabulary.find((entry) => entry.normalized === normalizedQueryWord);
  if (exactCandidate) {
    return null;
  }

  const orthographicQueryWord = normalizeOrthography(normalizedQueryWord);
  const orthographicCandidates = vocabulary.filter((entry) => entry.orthographic === orthographicQueryWord);

  if (!orthographicCandidates.length) {
    return null;
  }

  const bestCandidate = orthographicCandidates
    .map((entry) => ({
      ...entry,
      distance: levenshteinDistance(normalizedQueryWord, entry.normalized)
    }))
    .filter((entry) => entry.distance > 0 && entry.distance <= 2)
    .sort((left, right) => {
      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }

      return left.normalized.length - right.normalized.length;
    })[0];

  return bestCandidate || null;
}

function buildCorrectedSearchQuery(rawQuery, vocabulary) {
  const queryWords = extractWords(rawQuery);

  if (!queryWords.length) {
    return null;
  }

  let correctedWordsCount = 0;

  const correctedWords = queryWords.map((word) => {
    const correction = getBestWordCorrection(word, vocabulary);

    if (!correction) {
      return normalizeSearchText(word);
    }

    correctedWordsCount += 1;
    return correction.display;
  });

  if (!correctedWordsCount) {
    return null;
  }

  return correctedWords.join(" ").trim();
}

function formatArsAmount(value) {
  return `${Number(value || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ARS`;
}

function isOrderPaid(order) {
  const normalizedStatus = String(order?.paymentStatus || "").trim().toLowerCase();

  return (
    normalizedStatus.includes("pagado")
    || normalizedStatus.includes("paid")
    || normalizedStatus.includes("approved")
    || normalizedStatus.includes("aprobado")
  );
}

function formatNotificationRelativeDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return "Hace instantes";
  }

  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} minuto${diffMinutes === 1 ? "" : "s"}`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours === 1 ? "" : "s"}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `Hace ${diffDays} día${diffDays === 1 ? "" : "s"}`;
  }

  return date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getProductRecentValue(product) {
  const createdAtValue = Date.parse(String(product?.createdAt || ""));
  if (Number.isFinite(createdAtValue)) {
    return createdAtValue;
  }

  const numericId = Number(product?.id);
  if (Number.isFinite(numericId)) {
    return numericId;
  }

  return 0;
}

function App() {
  const [products, setProducts] = useState([]);
  const [productsLoadError, setProductsLoadError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(parsed)) {
        return [];
      }

      const seen = new Set();
      return parsed
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .filter((item) => {
          const key = normalizeSearchText(item);

          if (!key || seen.has(key)) {
            return false;
          }

          seen.add(key);
          return true;
        })
        .slice(0, RECENT_SEARCHES_LIMIT);
    } catch {
      return [];
    }
  });
  const [selectedCategory, setSelectedCategory] = useState("Todos los productos");
  const [categoryVisibleCount, setCategoryVisibleCount] = useState(CATEGORY_PAGE_SIZE);
  const [searchVisibleCount, setSearchVisibleCount] = useState(SEARCH_PAGE_SIZE);
  const [resultsSortKey, setResultsSortKey] = useState("recent");
  const [isResultsFilterOpen, setIsResultsFilterOpen] = useState(false);
  const [auth, setAuth] = useState(() => {
    try {
      const raw = localStorage.getItem("auth");
      return raw ? JSON.parse(raw) : { token: null, user: null };
    } catch {
      return { token: null, user: null };
    }
  });
  const [activeSection, setActiveSection] = useState("home");
  const [accountInitialTab, setAccountInitialTab] = useState("cuenta");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginModalView, setLoginModalView] = useState("register");
  const [loginInviteMessage, setLoginInviteMessage] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isWelcomeDiscountModalOpen, setIsWelcomeDiscountModalOpen] = useState(false);
  const [pendingWelcomePromoFocus, setPendingWelcomePromoFocus] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [orders, setOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [isMyOrdersLoading, setIsMyOrdersLoading] = useState(false);
  const [serverNotifications, setServerNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [shippingRules, setShippingRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [members, setMembers] = useState([]);
  const [administrators, setAdministrators] = useState([]);
  const [reorderItemsByCustomer, setReorderItemsByCustomer] = useState({});
  const [customerActivityByCustomer, setCustomerActivityByCustomer] = useState({});
  const [salesByProduct, setSalesByProduct] = useState([]);
  const [salesByBrand, setSalesByBrand] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState({ productAlerts: [], variantAlerts: [] });
  const [tickets, setTickets] = useState([]);
  const [ticketMetrics, setTicketMetrics] = useState({ open: 0, inProgress: 0, testing: 0, closed: 0 });
  const [isTicketsLoading, setIsTicketsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [variantsByProduct, setVariantsByProduct] = useState({});
  const [checkoutForm, setCheckoutForm] = useState({
    firstName: "",
    lastName: "",
    customerName: "",
    customerPhone: "",
    street: "",
    number: "",
    floor: "",
    apartment: "",
    city: "Buenos Aires",
    province: "Buenos Aires",
    postalCode: "",
    notes: "",
    country: "Argentina",
    consumerType: "consumidor-final",
    needsFacturaA: false,
    saveAddress: false,
    shippingMethod: "",
    shippingZone: "caba",
    paymentMethod: "mercadopago"
  });
  const [addressValidationErrors, setAddressValidationErrors] = useState([]);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isSmartOrderOpen, setIsSmartOrderOpen] = useState(false);
  const [isCartDrawerClosing, setIsCartDrawerClosing] = useState(false);
  const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState({});
  const [selectedProductImageIndex, setSelectedProductImageIndex] = useState(0);
  const [openInfoSection, setOpenInfoSection] = useState("description");
  const [openHomeFaqId, setOpenHomeFaqId] = useState("");
  const [activeFooterMobileTab, setActiveFooterMobileTab] = useState("contact");
  const [lastAddedProduct, setLastAddedProduct] = useState(null);
  const [addPopupVersion, setAddPopupVersion] = useState(0);
  const [catalogQuantities, setCatalogQuantities] = useState({});
  const [mobileCarouselPage, setMobileCarouselPage] = useState(0);
  const [mobileCarouselAnimKey, setMobileCarouselAnimKey] = useState(0);
  const [saphirusMobileCarouselPage, setSaphirusMobileCarouselPage] = useState(0);
  const [saphirusMobileCarouselAnimKey, setSaphirusMobileCarouselAnimKey] = useState(0);
  const [favoriteProductIds, setFavoriteProductIds] = useState([]);
  const [complaintForm, setComplaintForm] = useState(INITIAL_COMPLAINT_FORM);
  const [complaintAttachmentFile, setComplaintAttachmentFile] = useState(null);
  const [complaintAttachmentName, setComplaintAttachmentName] = useState("");
  const [complaintSubmitMessage, setComplaintSubmitMessage] = useState("");
  const [isComplaintSubmitting, setIsComplaintSubmitting] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState(INITIAL_WITHDRAWAL_FORM);
  const [withdrawalAttachmentFile, setWithdrawalAttachmentFile] = useState(null);
  const [withdrawalAttachmentName, setWithdrawalAttachmentName] = useState("");
  const [withdrawalSubmitMessage, setWithdrawalSubmitMessage] = useState("");
  const [isWithdrawalSubmitting, setIsWithdrawalSubmitting] = useState(false);
  const [isCartPromoOpen, setIsCartPromoOpen] = useState(false);
  const [isClearCartConfirmOpen, setIsClearCartConfirmOpen] = useState(false);
  const [isCartNoteOpen, setIsCartNoteOpen] = useState(false);
  const [isCheckoutPromoOpen, setIsCheckoutPromoOpen] = useState(false);
  const [isAdminNotificationsOpen, setIsAdminNotificationsOpen] = useState(false);
  const [adminOrderNavigationRequest, setAdminOrderNavigationRequest] = useState(null);
  const [seenAdminNotificationIds, setSeenAdminNotificationIds] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.sessionStorage.getItem(ADMIN_NOTIFICATIONS_SEEN_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => String(item || "").trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  });
  const [cartPromoCode, setCartPromoCode] = useState("");
  const [cartOrderNote, setCartOrderNote] = useState("");
  const [isApplyingCartPromo, setIsApplyingCartPromo] = useState(false);
  const [cartPromoMessage, setCartPromoMessage] = useState("");
  const [cartStockMessage, setCartStockMessage] = useState("");
  const [cartStockMessageCartKey, setCartStockMessageCartKey] = useState("");
  const [appliedCartPromotion, setAppliedCartPromotion] = useState(null);
  const [cartNoteMessage, setCartNoteMessage] = useState("");
  const [shouldFocusCartPromoInput, setShouldFocusCartPromoInput] = useState(false);
  const [welcomePromoMessage, setWelcomePromoMessage] = useState("");
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const productsRowRef = useRef(null);
  const mobileSwipeStartXRef = useRef(null);
  const saphirusMobileSwipeStartXRef = useRef(null);
  const similarProductsRowRef = useRef(null);
  const saphirusProductsRowRef = useRef(null);
  const cartDrawerLockedScrollYRef = useRef(0);
  const hadCartDrawerBodyLockRef = useRef(false);
  const savedCatalogScrollYRef = useRef(0);
  const adminNotificationsRef = useRef(null);
  const cartPromoInputRef = useRef(null);
  const cartDrawerPromoInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const addressDebounceRef = useRef(null);
  const reviewsListRef = useRef(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const hasProcessedInitialProductQueryRef = useRef(false);
  const previousActiveSectionRef = useRef(activeSection);
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY)
        || localStorage.getItem(GUEST_CART_STORAGE_KEY)
        || localStorage.getItem("cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  async function refreshProducts() {
    const data = await fetchProducts();
    setProducts(data.items || []);
    setProductsLoadError("");
  }

  function scrollToPageTop() {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto"
    });
  }

  async function refreshOrders(token) {
    const data = await fetchOrders(token);
    setOrders(data.items || []);
  }

  async function refreshMyOrders(token) {
    setIsMyOrdersLoading(true);
    try {
      const data = await fetchMyOrders(token);
      setMyOrders(data.items || []);
    } catch {
      setMyOrders([]);
    } finally {
      setIsMyOrdersLoading(false);
    }
  }

  async function refreshServerNotifications(token) {
    try {
      const data = await fetchNotifications(token, { limit: 50 });
      const items = data.items || [];
      setServerNotifications(items);
      setUnreadNotificationsCount(items.filter((n) => !n.isRead).length);
    } catch {
      /* ignore */
    }
  }

  async function refreshAdminAnalytics(token, period = "30d") {
    if (!token) {
      setAnalyticsData(null);
      return;
    }

    setIsAnalyticsLoading(true);

    try {
      const data = await fetchAdminAnalytics(token, period);
      setAnalyticsData(data || null);
    } finally {
      setIsAnalyticsLoading(false);
    }
  }

  async function refreshAdminData(token) {
    const [rulesData, categoriesData, promosData, customersData, membersData, administratorsData, productReportData, brandReportData, alertsData, analyticsResponse] = await Promise.all([
      fetchShippingRules(token),
      fetchAdminCategories(token),
      fetchPromotions(token),
      fetchCustomersHistory(token),
      fetchMembers(token),
      fetchAdministrators(token),
      fetchSalesByProduct(token),
      fetchSalesByBrand(token),
      fetchLowStockAlerts(token),
      fetchAdminAnalytics(token, "30d")
    ]);

    setShippingRules(rulesData.items || []);
    setCategories(categoriesData.items || []);
    setPromotions(promosData.items || []);
    setCustomers(customersData.items || []);
    setMembers(membersData.items || []);
    setAdministrators(administratorsData.items || []);
    setSalesByProduct(productReportData.items || []);
    setSalesByBrand(brandReportData.items || []);
    setLowStockAlerts(alertsData || { productAlerts: [], variantAlerts: [] });
    setAnalyticsData(analyticsResponse || null);
  }

  async function refreshTicketsData(token, userRole) {
    if (!token) {
      setTickets([]);
      setTicketMetrics({ open: 0, inProgress: 0, testing: 0, closed: 0 });
      return;
    }

    setIsTicketsLoading(true);

    try {
      const filters = userRole === "admin" ? {} : { mine: true };
      const [ticketsData, metricsData] = await Promise.all([
        fetchTickets(token, filters),
        fetchTicketMetrics(token)
      ]);

      setTickets(ticketsData.items || []);
      setTicketMetrics({
        open: Number(metricsData.open || 0),
        inProgress: Number(metricsData.inProgress || 0),
        testing: Number(metricsData.testing || 0),
        closed: Number(metricsData.closed || 0)
      });
    } finally {
      setIsTicketsLoading(false);
    }
  }

  function isUnauthorizedError(error) {
    const message = String(error?.message || "").toLowerCase();
    return message.includes("no autorizado") || message.includes("token inválido") || message.includes("token invalido");
  }

  useEffect(() => {
    refreshProducts()
      .catch((error) => {
        setProducts([]);
        setProductsLoadError(error?.message || "No se pudieron cargar los productos.");
      });
  }, []);

  // Scroll effect: hide header on scroll down, show on scroll up (Apple/Stripe style)
  useEffect(() => {
    let ticking = false;
    let prevScrollPos = window.scrollY;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollPos = window.scrollY;

          // Always show header when at the very top
          if (currentScrollPos < 10) {
            setShowHeader(true);
            setLastScrollY(currentScrollPos);
            prevScrollPos = currentScrollPos;
            ticking = false;
            return;
          }

          // Detect scroll direction
          const scrollingDown = currentScrollPos > prevScrollPos;
          const scrollingUp = currentScrollPos < prevScrollPos;

          // Only hide when scrolling down and past 80px
          if (scrollingDown && currentScrollPos > 80) {
            setShowHeader(false);
          }
          
          // Show immediately when scrolling up
          if (scrollingUp) {
            setShowHeader(true);
          }

          setLastScrollY(currentScrollPos);
          prevScrollPos = currentScrollPos;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = String(params.get("checkout") || "").trim().toLowerCase();
    const orderId = String(params.get("order") || "").trim();

    if (!["success", "failure", "pending"].includes(checkoutStatus)) {
      return;
    }

    setActiveSection("cart");
    setIsCartDrawerClosing(false);
    setIsCartDrawerOpen(false);

    if (checkoutStatus === "success") {
      clearCart();
      setCheckoutMessage(orderId
        ? `Pago aprobado. Pedido #${orderId}. ¡Gracias por tu compra!`
        : "Pago aprobado. ¡Gracias por tu compra!");
    } else if (checkoutStatus === "pending") {
      setCheckoutMessage(orderId
        ? `Tu pago está pendiente de confirmación. Pedido #${orderId}.`
        : "Tu pago está pendiente de confirmación.");
    } else {
      setCheckoutMessage(orderId
        ? `No se pudo completar el pago del pedido #${orderId}. Podés intentarlo nuevamente.`
        : "No se pudo completar el pago. Podés intentarlo nuevamente.");
    }

    params.delete("checkout");
    params.delete("order");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash || ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || hasProcessedInitialProductQueryRef.current || !products.length) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedSlug = String(params.get("producto") || "").trim().toLowerCase();
    hasProcessedInitialProductQueryRef.current = true;

    if (!requestedSlug) {
      return;
    }

    const matchedProduct = products.find((product) => {
      const productSlug = String(getProductSeoSlug(product) || "").trim().toLowerCase();
      return productSlug === requestedSlug;
    });

    if (!matchedProduct) {
      return;
    }

    setSelectedProduct(matchedProduct);
    setSelectedProductImageIndex(0);
    setOpenInfoSection("description");
    setActiveSection("product");
  }, [products]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const currentProductParam = String(params.get("producto") || "").trim();
    const isViewingProduct = activeSection === "product" && Boolean(selectedProduct);

    if (!isViewingProduct) {
      if (!currentProductParam) {
        return;
      }

      params.delete("producto");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash || ""}`;
      window.history.replaceState({}, "", nextUrl);
      return;
    }

    const nextSlug = getProductSeoSlug(selectedProduct);
    if (!nextSlug || currentProductParam === nextSlug) {
      return;
    }

    params.set("producto", nextSlug);
    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash || ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [activeSection, selectedProduct]);

  useEffect(() => {
    localStorage.setItem("auth", JSON.stringify(auth));
  }, [auth]);

  useEffect(() => {
    if (!auth.user) {
      return;
    }

    const { addressBook: storedAddressBook, primaryAddressId: storedPrimaryAddressId } = readStoredAddressBook(auth.user);
    if (!storedAddressBook.length) {
      return;
    }

    const currentBook = Array.isArray(auth.user.addressBook) ? auth.user.addressBook : [];
    if (currentBook.length) {
      return;
    }

    const validPrimaryAddressId = storedAddressBook.some((entry) => entry.id === storedPrimaryAddressId)
      ? storedPrimaryAddressId
      : storedAddressBook[0]?.id || "";

    const primaryEntry = storedAddressBook.find((entry) => entry.id === validPrimaryAddressId) || storedAddressBook[0];
    const primaryAddress = primaryEntry ? buildAddressFromEntry(primaryEntry) : String(auth.user?.address || "").trim();

    setAuth((current) => {
      if (!current.user) {
        return current;
      }

      return {
        ...current,
        user: {
          ...current.user,
          address: primaryAddress,
          addressBook: storedAddressBook,
          primaryAddressId: validPrimaryAddressId
        }
      };
    });
  }, [auth.user?.id, auth.user?.email]);

  useEffect(() => {
    if (!auth.user) {
      return;
    }

    const storageKey = getAddressBookStorageKey(auth.user);
    if (!storageKey) {
      return;
    }

    const addressBook = Array.isArray(auth.user.addressBook)
      ? auth.user.addressBook
        .map((entry, index) => normalizeAddressBookEntry(entry, `addr-${index + 1}`))
        .slice(0, MAX_ACCOUNT_ADDRESSES)
      : [];

    const primaryAddressId = String(auth.user.primaryAddressId || "").trim();

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        addressBook,
        primaryAddressId
      })
    );
  }, [auth.user?.id, auth.user?.email, auth.user?.addressBook, auth.user?.primaryAddressId]);

  useEffect(() => {
    if (!auth.token || !auth.user) {
      return;
    }

    if (auth.user.role === "admin") {
      if (activeSection !== "admin") {
        return;
      }

      refreshOrders(auth.token)
        .then(() => Promise.all([
          refreshAdminData(auth.token),
          refreshTicketsData(auth.token, auth.user.role),
          refreshServerNotifications(auth.token)
        ]))
        .catch((error) => {
          setOrders([]);

          if (isUnauthorizedError(error)) {
            setAuth({ token: null, user: null });
            setIsLoginOpen(true);
            setLoginModalView("login");
            setAuthError("Tu sesión venció o es inválida. Volvé a iniciar sesión.");
          }
        });
      return;
    }

    const isAccountSection = activeSection === "account";
    refreshTicketsData(auth.token, auth.user.role).catch((error) => {
      setTickets([]);
      setTicketMetrics({ open: 0, inProgress: 0, testing: 0, closed: 0 });

      if (isUnauthorizedError(error)) {
        setAuth({ token: null, user: null });
        setIsLoginOpen(true);
        setLoginModalView("login");
        setAuthError("Tu sesión venció o es inválida. Volvé a iniciar sesión.");
      }
    });

    refreshMyOrders(auth.token).catch(() => {});
  }, [auth.token, auth.user?.id, auth.user?.role, activeSection]);

  useEffect(() => {
    if (!auth.token || auth.user?.role !== "admin" || activeSection !== "admin") {
      return;
    }

    const interval = setInterval(() => {
      refreshServerNotifications(auth.token);
    }, 45_000);

    return () => clearInterval(interval);
  }, [auth.token, auth.user?.role, activeSection]);

  useEffect(() => {
    const savedAddress = String(auth.user?.address || "").trim();

    if (!savedAddress) {
      return;
    }

    setCheckoutForm((current) => {
      if (String(current.street || "").trim()) {
        return current;
      }

      return {
        ...current,
        street: savedAddress
      };
    });
  }, [auth.user?.address]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    localStorage.removeItem("cart");
    if (!auth.user) {
      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
    } else {
      localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    }
  }, [auth.user, cart]);

  useEffect(() => {
    if (!auth.token || !auth.user) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveUserCart(auth.token, cart).catch((error) => {
        if (isUnauthorizedError(error)) {
          setAuth({ token: null, user: null });
          setIsLoginOpen(true);
          setLoginModalView("login");
          setAuthError("Tu sesión venció o es inválida. Volvé a iniciar sesión.");
        }
      });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [auth.token, auth.user?.id, auth.user?.role, cart]);

  useEffect(() => {
    if (!auth.token || !auth.user) return;

    let cancelled = false;
    fetchUserCart(auth.token)
      .then((response) => {
        if (cancelled) return;
        const backendItems = Array.isArray(response?.items) ? response.items : [];
        if (backendItems.length === 0) return;

        setCart((localCart) => {
          if (localCart.length === 0) return backendItems;
          return mergeCartItems(localCart, backendItems);
        });
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [auth.token, auth.user?.id]);

  useEffect(() => {
    localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

  const favoriteStorageKey = useMemo(() => {
    const userId = auth.user?.id || auth.user?.email;

    if (!userId) {
      return null;
    }

    return `favorites:${String(userId)}`;
  }, [auth.user]);

  useEffect(() => {
    if (!favoriteStorageKey) {
      setFavoriteProductIds([]);
      return;
    }

    try {
      const raw = localStorage.getItem(favoriteStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];

      if (Array.isArray(parsed)) {
        setFavoriteProductIds(parsed.map((id) => String(id)));
        return;
      }

      setFavoriteProductIds([]);
    } catch {
      setFavoriteProductIds([]);
    }
  }, [favoriteStorageKey]);

  useEffect(() => {
    if (!favoriteStorageKey) {
      return;
    }

    localStorage.setItem(favoriteStorageKey, JSON.stringify(favoriteProductIds));
  }, [favoriteStorageKey, favoriteProductIds]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        if (isAddPopupOpen) {
          setIsAddPopupOpen(false);
          return;
        }

        if (isCartDrawerOpen) {
          closeCartDrawer();
        }
      }
    }

    if (isCartDrawerOpen || isAddPopupOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isCartDrawerOpen, isAddPopupOpen]);

  useEffect(() => {
    if (!isAddPopupOpen) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsAddPopupOpen(false);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isAddPopupOpen, addPopupVersion]);

  useEffect(() => {
    if (isCartDrawerOpen) {
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      cartDrawerLockedScrollYRef.current = currentScrollY;
      hadCartDrawerBodyLockRef.current = true;
      document.body.style.position = "fixed";
      document.body.style.top = `-${currentScrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        const lockedScrollY = cartDrawerLockedScrollYRef.current || 0;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo({ top: lockedScrollY, left: 0, behavior: "auto" });
      };
    }

    const lockedScrollY = cartDrawerLockedScrollYRef.current || 0;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
    if (hadCartDrawerBodyLockRef.current) {
      window.scrollTo({ top: lockedScrollY, left: 0, behavior: "auto" });
      hadCartDrawerBodyLockRef.current = false;
    }

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
    };
  }, [isCartDrawerOpen]);

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [cart]
  );

  const freeShippingProgressPercent = useMemo(() => {
    if (!FREE_SHIPPING_TARGET_ARS) {
      return 0;
    }

    return Math.min(100, Math.max(0, (cartSubtotal / FREE_SHIPPING_TARGET_ARS) * 100));
  }, [cartSubtotal]);

  const freeShippingRemaining = useMemo(
    () => Math.max(0, FREE_SHIPPING_TARGET_ARS - cartSubtotal),
    [cartSubtotal]
  );

  const hasReachedFreeShipping = freeShippingRemaining <= 0;

  const cartDiscount = useMemo(
    () => Number(appliedCartPromotion?.discount || 0),
    [appliedCartPromotion]
  );

  const appliedCartPromoPercent = useMemo(() => {
    if (!appliedCartPromotion || cartSubtotal <= 0 || cartDiscount <= 0) {
      return null;
    }

    const percent = (cartDiscount / cartSubtotal) * 100;

    if (!Number.isFinite(percent) || percent <= 0) {
      return null;
    }

    return Number(percent.toFixed(percent >= 10 ? 0 : 1));
  }, [appliedCartPromotion, cartDiscount, cartSubtotal]);

  const cartSubtotalAfterDiscount = useMemo(
    () => Math.max(0, Number((cartSubtotal - cartDiscount).toFixed(2))),
    [cartSubtotal, cartDiscount]
  );

  const checkoutShippingCost = useMemo(() => {
    if (checkoutForm.shippingMethod === "pickup") {
      return 0;
    }

    if (checkoutForm.shippingMethod === "delivery") {
      if (hasReachedFreeShipping) return 0;
      return checkoutForm.shippingZone === "caba" ? 5000 : 7000;
    }

    return 0;
  }, [checkoutForm.shippingMethod, checkoutForm.shippingZone, hasReachedFreeShipping]);

  const welcomeDiscountAmount = useMemo(() => {
    if (!auth.user?.welcomeDiscountActive || auth.user?.welcomeDiscountUsed) {
      return 0;
    }

    // Check if discount has expired
    if (auth.user?.welcomeDiscountExpiresAt) {
      const expiresAt = new Date(auth.user.welcomeDiscountExpiresAt);
      if (new Date() > expiresAt) {
        return 0;
      }
    }

    // Apply 10% discount to cart subtotal (after promo codes but before shipping)
    return Math.round(cartSubtotalAfterDiscount * 0.10);
  }, [auth.user, cartSubtotalAfterDiscount]);

  const checkoutTotal = useMemo(
    () => cartSubtotalAfterDiscount - welcomeDiscountAmount + checkoutShippingCost,
    [cartSubtotalAfterDiscount, welcomeDiscountAmount, checkoutShippingCost]
  );

  const checkoutShippingSummaryLabel = useMemo(() => {
    if (checkoutForm.shippingMethod === "pickup") {
      return "Gratis";
    }

    if (checkoutForm.shippingMethod === "delivery") {
      if (hasReachedFreeShipping) return "Gratis";
      return `$${checkoutShippingCost.toLocaleString("es-AR")} ARS`;
    }

    return "Elegí un método";
  }, [checkoutForm.shippingMethod, checkoutShippingCost, hasReachedFreeShipping]);

  const checkoutShippingOptionValue = useMemo(() => {
    if (checkoutForm.shippingMethod === "pickup") return "pickup";
    if (checkoutForm.shippingMethod === "delivery") {
      return checkoutForm.shippingZone === "gba" ? "delivery-gba" : "delivery-caba";
    }
    return "";
  }, [checkoutForm.shippingMethod, checkoutForm.shippingZone]);

  const emptyCartRecommendations = useMemo(() => {
    if (cart.length || !products.length) return [];
    const visible = products.filter((p) => p.is_visible !== false && p.stock > 0);
    const shuffled = [...visible].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }, [cart.length, products]);

  const cartViewRecommendations = useMemo(() => {
    if (!products.length) return { featured: [], byCategory: [], topBrands: [] };
    const visible = products.filter((p) => p.is_visible !== false && p.stock > 0);

    const shuffled = [...visible].sort(() => Math.random() - 0.5);
    const featured = shuffled.slice(0, 8);

    const categoryMap = {};
    visible.forEach((p) => {
      const cats = Array.isArray(p.categories) ? p.categories : [];
      const cat = cats[0] || "Otros";
      if (!categoryMap[cat]) categoryMap[cat] = [];
      if (categoryMap[cat].length < 4) categoryMap[cat].push(p);
    });
    const byCategory = Object.entries(categoryMap)
      .filter(([, items]) => items.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([name, items]) => ({ name, items }));

    const brandCount = {};
    visible.forEach((p) => {
      if (p.brand) brandCount[p.brand] = (brandCount[p.brand] || 0) + 1;
    });
    const topBrands = Object.entries(brandCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name);

    return { featured, byCategory, topBrands };
  }, [products]);

  useEffect(() => {
    setAppliedCartPromotion(null);
    setCartPromoMessage("");
  }, [cart]);

  // Auto-set shipping method from previously selected delivery zone
  useEffect(() => {
    if (activeSection !== "cart") return;
    if (checkoutForm.shippingMethod) return; // already chosen, don't override
    try {
      const raw = localStorage.getItem("delivery:selected-zone");
      if (!raw) return;
      const stored = JSON.parse(raw);
      if (stored?.zone === "caba" || stored?.zone === "gba") {
        setCheckoutForm((current) => ({
          ...current,
          shippingMethod: "delivery",
          shippingZone: stored.zone
        }));
      }
    } catch { /* silent */ }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "checkout-details") {
      return;
    }

    if (!auth.user || String(cartPromoCode || "").trim() || appliedCartPromotion?.code) {
      return;
    }

    setCartPromoCode(WELCOME_PROMO_CODE);
  }, [activeSection, auth.user, cartPromoCode, appliedCartPromotion]);

  useEffect(() => {
    if (activeSection !== "cart" || !isCartPromoOpen || !shouldFocusCartPromoInput) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (!cartPromoInputRef.current) {
        return;
      }

      cartPromoInputRef.current.focus();
      cartPromoInputRef.current.select();
    });

    setShouldFocusCartPromoInput(false);
  }, [activeSection, isCartPromoOpen, shouldFocusCartPromoInput]);

  useEffect(() => {
    if (!isCartDrawerOpen || !isCartPromoOpen || !shouldFocusCartPromoInput) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (!cartDrawerPromoInputRef.current) {
        return;
      }

      cartDrawerPromoInputRef.current.focus();
      cartDrawerPromoInputRef.current.select();
    });

    setShouldFocusCartPromoInput(false);
  }, [isCartDrawerOpen, isCartPromoOpen, shouldFocusCartPromoInput]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!apiKey || window.__gmapsScriptLoaded || window.__gmapsAuthFailed) return;

    window.gm_authFailure = () => { window.__gmapsAuthFailed = true; };

    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
      s.async = true;
      s.onload = () => { window.__gmapsScriptLoaded = true; };
      document.head.appendChild(s);
    }
  }, []);

  function detectShippingZone(city, province, postalCode) {
    const c = (city || "").trim().toLowerCase();
    const p = (province || "").trim().toLowerCase();
    const pc = (postalCode || "").trim().toUpperCase();

    if (pc.startsWith("C1")) return "caba";
    const pcNum = parseInt(pc, 10);
    if (pcNum >= 1000 && pcNum <= 1499) return "caba";

    if (p.includes("ciudad aut\u00f3noma") || p === "caba") return "caba";
    if (c === "buenos aires" && !p.includes("provincia")) return "caba";

    return "gba";
  }

  function validateAddress(form) {
    const errors = [];
    if (form.shippingMethod !== "delivery") return errors;
    if (!form.street || form.street.trim().length < 3) errors.push("La calle debe tener al menos 3 caracteres.");
    if (!form.number || !form.number.trim()) errors.push("El n\u00famero es obligatorio.");
    if (!form.postalCode || form.postalCode.replace(/\D/g, "").length < 4) errors.push("El c\u00f3digo postal debe tener al menos 4 d\u00edgitos.");
    if (!form.city || form.city.trim().length < 2) errors.push("La ciudad es obligatoria.");
    if (!form.province || form.province.trim().length < 2) errors.push("La provincia es obligatoria.");
    return errors;
  }

  function fetchAddressSuggestions(input) {
    if (input.length < 2 || !window.google?.maps?.places || window.__gmapsAuthFailed) {
      setAddressSuggestions([]);
      return;
    }

    if (!window.__gmapsAutocompleteService) {
      window.__gmapsAutocompleteService = new window.google.maps.places.AutocompleteService();
    }

    const searchText = [input, checkoutForm.number].filter(Boolean).join(" ");

    const request = {
      input: searchText + ", Buenos Aires, Argentina",
      componentRestrictions: { country: "ar" },
      types: ["address"],
    };

    request.bounds = new window.google.maps.LatLngBounds(
      { lat: -34.950, lng: -58.900 },
      { lat: -34.300, lng: -58.100 }
    );

    window.__gmapsAutocompleteService.getPlacePredictions(request, (predictions, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        setAddressSuggestions(predictions);
      } else {
        setAddressSuggestions([]);
      }
    });
  }

  function handleAddressSuggestionSelect(prediction) {
    setAddressSuggestions([]);

    if (!window.__gmapsPlacesService) {
      const div = document.createElement("div");
      window.__gmapsPlacesService = new window.google.maps.places.PlacesService(div);
    }

    window.__gmapsPlacesService.getDetails(
      { placeId: prediction.place_id, fields: ["address_components", "formatted_address"] },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) return;

        let streetNumber = "", streetName = "", city = "", province = "", postalCode = "";
        let sublocality = "";

        for (const c of place.address_components) {
          const { types, long_name } = c;
          if (types.includes("street_number")) streetNumber = long_name;
          else if (types.includes("route")) streetName = long_name;
          else if (types.includes("locality")) city = long_name;
          else if (types.includes("sublocality_level_1") || types.includes("sublocality")) sublocality = long_name;
          else if (types.includes("administrative_area_level_1")) province = long_name;
          else if (types.includes("postal_code")) postalCode = long_name;
        }

        const resolvedCity = city || sublocality;
        const detectedZone = detectShippingZone(resolvedCity, province, postalCode);

        setCheckoutForm((current) => ({
          ...current,
          street: streetName || current.street,
          number: streetNumber || current.number,
          city: resolvedCity || current.city,
          province: province || current.province,
          postalCode: postalCode || current.postalCode,
          shippingZone: detectedZone,
        }));
        setAddressValidationErrors([]);
      }
    );
  }

  const favoriteProducts = useMemo(() => {
    const favoriteIdSet = new Set(favoriteProductIds.map((id) => String(id)));
    return products.filter((product) => product.isVisible !== false && favoriteIdSet.has(String(product.id)));
  }, [products, favoriteProductIds]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    const normalizedSelectedCategory = normalizeSearchText(selectedCategory);
    const visibleProducts = products.filter((product) => product.isVisible !== false);

    const categoryFilteredProducts =
      !normalizedSelectedCategory || normalizedSelectedCategory === "todos los productos"
        ? visibleProducts
        : visibleProducts.filter((product) => {
          const productCategories = getProductCategoriesForSearch(product)
            .map((category) => normalizeSearchText(category))
            .filter(Boolean);

          if (!matchesSelectedCategory(productCategories, normalizedSelectedCategory)) {
            return false;
          }

          const requiredBrand = CATEGORY_BRAND_CONSTRAINT[normalizedSelectedCategory];
          if (requiredBrand) {
            return normalizeSearchText(product?.brand) === requiredBrand;
          }

          return true;
        });

    if (!normalizedSearch) {
      return categoryFilteredProducts;
    }

    return categoryFilteredProducts.filter((product) => matchesProductSearch(product, normalizedSearch));
  }, [products, searchTerm, selectedCategory]);

  const sortedFilteredProducts = useMemo(() => {
    const productsToSort = [...filteredProducts];

    productsToSort.sort((left, right) => {
      if (resultsSortKey === "price-desc") {
        return Number(right?.price || 0) - Number(left?.price || 0);
      }

      if (resultsSortKey === "price-asc") {
        return Number(left?.price || 0) - Number(right?.price || 0);
      }

      if (resultsSortKey === "name-asc") {
        return String(left?.name || "").localeCompare(String(right?.name || ""), "es", { sensitivity: "base" });
      }

      if (resultsSortKey === "name-desc") {
        return String(right?.name || "").localeCompare(String(left?.name || ""), "es", { sensitivity: "base" });
      }

      return getProductRecentValue(right) - getProductRecentValue(left);
    });

    return productsToSort;
  }, [filteredProducts, resultsSortKey]);

  const activeResultsSortOption = useMemo(
    () => RESULTS_SORT_OPTIONS.find((option) => option.key === resultsSortKey) || RESULTS_SORT_OPTIONS[0],
    [resultsSortKey]
  );
  const activeResultsSortLabel = activeResultsSortOption.label;
  const activeResultsSortIcon = activeResultsSortOption.icon;

  const saphirusGalleryProducts = useMemo(() => {
    const saphirusProducts = (products || [])
      .filter((product) => product?.isVisible !== false)
      .filter((product) => Number(product?.stock || 0) > 0)
      .filter((product) => {
        const normalizedCategories = getProductCategoriesForSearch(product)
          .map((category) => normalizeSearchText(category))
          .filter(Boolean);

        return normalizedCategories.some((category) => category.includes("saphirus"));
      });

    // Fisher-Yates para mostrar un mix aleatorio en cada carga/actualización del listado.
    const shuffledProducts = [...saphirusProducts];
    for (let index = shuffledProducts.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffledProducts[index], shuffledProducts[randomIndex]] = [shuffledProducts[randomIndex], shuffledProducts[index]];
    }

    return shuffledProducts;
  }, [products]);

  const searchSuggestions = useMemo(() => {
    const normalizedInput = normalizeSearchText(searchInput);

    if (!normalizedInput) {
      return [];
    }

    const seen = new Set();

    return products
      .filter((product) => product.isVisible !== false)
      .map((product) => String(product.name || "").trim())
      .filter(Boolean)
      .map((name) => ({
        name,
        score: getSearchSuggestionScore(normalizedInput, name)
      }))
      .filter((item) => Number.isFinite(item.score))
      .sort((left, right) => {
        if (left.score !== right.score) {
          return left.score - right.score;
        }

        return left.name.localeCompare(right.name, "es");
      })
      .map((item) => item.name)
      .filter((name) => {
        const key = name.toLowerCase();

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [products, searchInput]);

  const suggestedSearchCorrection = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);

    if (!normalizedSearch) {
      return "";
    }

    const vocabulary = buildSearchVocabulary(products);
    const correctedQuery = buildCorrectedSearchQuery(searchTerm, vocabulary);

    if (!correctedQuery) {
      return "";
    }

    const normalizedCorrectedQuery = normalizeSearchText(correctedQuery);

    if (!normalizedCorrectedQuery || normalizedCorrectedQuery === normalizedSearch) {
      return "";
    }

    return correctedQuery;
  }, [products, searchTerm]);

  useEffect(() => {
    setCategoryVisibleCount(CATEGORY_PAGE_SIZE);
    setSearchVisibleCount(SEARCH_PAGE_SIZE);
  }, [selectedCategory, searchTerm]);

  useEffect(() => {
    setIsResultsFilterOpen(false);
  }, [selectedCategory, searchTerm]);

  const getProductMediaItems = (product) => {
    if (!Array.isArray(product?.media)) {
      return [];
    }

    return product.media.filter((item) => item && typeof item === "object" && item.url);
  };

  const getProductImageAlt = (product, index = 0) => {
    const mediaItems = getProductMediaItems(product);
    const fallbackName = String(product?.name || "Producto").trim() || "Producto";
    const preferredItem = mediaItems[index] || mediaItems[0] || null;
    const mediaAlt = String(preferredItem?.alt || "").trim();

    if (mediaAlt) {
      return mediaAlt;
    }

    const seoImageAlt = String(product?.seo?.imageAlt || "").trim();
    if (seoImageAlt) {
      return seoImageAlt;
    }

    const focusKeyword = String(product?.seo?.focusKeyword || "").trim();
    return focusKeyword ? `${fallbackName} - ${focusKeyword}` : fallbackName;
  };

  const selectedProductMedia = useMemo(() => getProductMediaItems(selectedProduct), [selectedProduct]);

  const selectedProductImages = useMemo(() => {
    if (!selectedProduct) {
      return ["/fotos/foto-inicio.webp"];
    }

    const urls = selectedProductMedia.map((item) => item.url).filter(Boolean);

    return urls.length ? urls : ["/fotos/foto-inicio.webp"];
  }, [selectedProduct, selectedProductMedia]);

  const getCardImagePair = (product) => {
    const mediaItems = getProductMediaItems(product);
    const urls = mediaItems.map((item) => item.url).filter(Boolean);

    return {
      primaryImageUrl: urls[0] || "/fotos/foto-inicio.webp",
      secondaryImageUrl: urls[1] || "",
      primaryImageAlt: getProductImageAlt(product, 0),
      secondaryImageAlt: getProductImageAlt(product, 1)
    };
  };

  const getProductImageUrl = (product) => {
    const urls = getProductMediaItems(product).map((item) => item.url).filter(Boolean);

    return urls[0] || product?.imageUrl || "/fotos/foto-inicio.webp";
  };

  useEffect(() => {
    const defaultTitle = "La Boutique de la Limpieza";
    const defaultDescription = "Productos de limpieza para hogar y comercios en La Boutique de la Limpieza.";
    const siteName = "La Boutique de la Limpieza";

    function upsertMeta(attrName, key, content) {
      if (!content) {
        return;
      }

      let element = document.head.querySelector(`meta[${attrName}="${key}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, key);
        document.head.appendChild(element);
      }

      element.setAttribute("content", content);
    }

    function removeMeta(attrName, key) {
      const element = document.head.querySelector(`meta[${attrName}="${key}"]`);
      if (element) {
        element.remove();
      }
    }

    function setCanonical(canonicalHref) {
      if (!canonicalHref) {
        return;
      }

      let canonicalLink = document.head.querySelector("link[rel='canonical']");
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalLink);
      }

      canonicalLink.setAttribute("href", canonicalHref);
    }

    const existingProductScript = document.getElementById("product-seo-jsonld");
    const existingSiteScript = document.getElementById("site-seo-jsonld");
    const existingBreadcrumbScript = document.getElementById("product-breadcrumb-jsonld");
    if (existingProductScript) {
      existingProductScript.remove();
    }
    if (existingSiteScript) {
      existingSiteScript.remove();
    }
    if (existingBreadcrumbScript) {
      existingBreadcrumbScript.remove();
    }

    if (activeSection !== "product" || !selectedProduct) {
      document.title = defaultTitle;
      const defaultImage = `${window.location.origin}/fotos/foto-inicio.webp`;
      upsertMeta("name", "description", defaultDescription);
      upsertMeta("name", "robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
      upsertMeta("property", "og:type", "website");
      upsertMeta("property", "og:title", defaultTitle);
      upsertMeta("property", "og:description", defaultDescription);
      upsertMeta("property", "og:url", `${window.location.origin}${window.location.pathname}`);
      upsertMeta("property", "og:site_name", siteName);
      upsertMeta("property", "og:locale", "es_AR");
      upsertMeta("property", "og:image", defaultImage);
      upsertMeta("name", "twitter:card", "summary_large_image");
      upsertMeta("name", "twitter:title", defaultTitle);
      upsertMeta("name", "twitter:description", defaultDescription);
      upsertMeta("name", "twitter:image", defaultImage);
      removeMeta("name", "keywords");
      removeMeta("property", "product:price:amount");
      removeMeta("property", "product:price:currency");
      setCanonical(`${window.location.origin}${window.location.pathname}`);

      const siteJsonLdScript = document.createElement("script");
      siteJsonLdScript.id = "site-seo-jsonld";
      siteJsonLdScript.type = "application/ld+json";
      siteJsonLdScript.text = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            name: siteName,
            url: `${window.location.origin}${window.location.pathname}`,
            logo: `${window.location.origin}/fotos/logo/La%20boutique%20de%20la%20limpiezalogo.webp`
          },
          {
            "@type": "WebSite",
            name: siteName,
            url: `${window.location.origin}${window.location.pathname}`,
            potentialAction: {
              "@type": "SearchAction",
              target: `${window.location.origin}${window.location.pathname}?q={search_term_string}`,
              "query-input": "required name=search_term_string"
            }
          }
        ]
      });
      document.head.appendChild(siteJsonLdScript);
      return;
    }

    const seo = selectedProduct.seo && typeof selectedProduct.seo === "object" ? selectedProduct.seo : {};
    const baseName = String(selectedProduct.name || "Producto").trim() || "Producto";
    const title = String(seo.metaTitle || "").trim() || `${baseName} | ${defaultTitle}`;
    const description = String(seo.metaDescription || "").trim()
      || String(selectedProduct.shortDescription || "").trim()
      || String(selectedProduct.longDescription || "").trim()
      || `Conocé ${baseName} en La Boutique de la Limpieza.`;
    const keywords = Array.isArray(seo.keywords) ? seo.keywords.filter(Boolean).join(", ") : "";
    const ogTitle = String(seo.ogTitle || "").trim() || title;
    const ogDescription = String(seo.ogDescription || "").trim() || description;
    const twitterTitle = String(seo.twitterTitle || "").trim() || title;
    const twitterDescription = String(seo.twitterDescription || "").trim() || description;

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("name", "keywords", keywords);
    upsertMeta("property", "og:type", "product");
    upsertMeta("property", "og:title", ogTitle);
    upsertMeta("property", "og:description", ogDescription);
    upsertMeta("property", "og:image", selectedProductImages[0] || "/fotos/foto-inicio.webp");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", twitterTitle);
    upsertMeta("name", "twitter:description", twitterDescription);
    upsertMeta("name", "twitter:image", selectedProductImages[0] || "/fotos/foto-inicio.webp");

    const canonicalFromSeo = String(seo.canonicalUrl || "").trim();
    const slug = String(getProductSeoSlug(selectedProduct) || "").trim();
    const canonicalHref = canonicalFromSeo
      || (slug
        ? `${window.location.origin}${window.location.pathname}?producto=${encodeURIComponent(slug)}`
        : `${window.location.origin}${window.location.pathname}`);
    setCanonical(canonicalHref);
    upsertMeta("name", "robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
    upsertMeta("property", "og:url", canonicalHref);
    upsertMeta("property", "og:site_name", siteName);
    upsertMeta("property", "og:locale", "es_AR");
    upsertMeta("property", "product:price:amount", String(Number(selectedProduct.price || 0)));
    upsertMeta("property", "product:price:currency", "ARS");

    const jsonLdScript = document.createElement("script");
    jsonLdScript.id = "product-seo-jsonld";
    jsonLdScript.type = "application/ld+json";
    jsonLdScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: baseName,
      url: canonicalHref,
      description,
      image: selectedProductImages.filter(Boolean),
      sku: String(selectedProduct.id || ""),
      category: Array.isArray(selectedProduct.categories) ? selectedProduct.categories[0] : undefined,
      brand: selectedProduct.brand ? { "@type": "Brand", name: selectedProduct.brand } : undefined,
      offers: {
        "@type": "Offer",
        url: canonicalHref,
        priceCurrency: "ARS",
        price: Number(selectedProduct.price || 0),
        availability: Number(selectedProduct.stock || 0) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
        seller: {
          "@type": "Organization",
          name: siteName
        }
      }
    });
    document.head.appendChild(jsonLdScript);

    const productCategory = Array.isArray(selectedProduct.categories)
      ? String(selectedProduct.categories[0] || "").trim()
      : "";

    if (productCategory) {
      const categorySlug = encodeURIComponent(toSeoSlug(productCategory));
      const breadcrumbScript = document.createElement("script");
      breadcrumbScript.id = "product-breadcrumb-jsonld";
      breadcrumbScript.type = "application/ld+json";
      breadcrumbScript.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Inicio",
            item: `${window.location.origin}${window.location.pathname}`
          },
          {
            "@type": "ListItem",
            position: 2,
            name: productCategory,
            item: `${window.location.origin}${window.location.pathname}?categoria=${categorySlug}`
          },
          {
            "@type": "ListItem",
            position: 3,
            name: baseName,
            item: canonicalHref
          }
        ]
      });
      document.head.appendChild(breadcrumbScript);
    }

    return () => {
      const productScript = document.getElementById("product-seo-jsonld");
      const breadcrumbScript = document.getElementById("product-breadcrumb-jsonld");
      if (productScript) {
        productScript.remove();
      }
      if (breadcrumbScript) {
        breadcrumbScript.remove();
      }
    };
  }, [activeSection, selectedProduct, selectedProductImages]);

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) {
      return [];
    }

    const selectedCategories = Array.isArray(selectedProduct.categories)
      ? selectedProduct.categories
        .map((category) => {
          if (typeof category === "string") {
            return category.toLowerCase();
          }

          return String(category?.name || "").toLowerCase();
        })
        .filter(Boolean)
      : [];

    const visibleProducts = products.filter((product) => (
      product.isVisible !== false
      && product.id !== selectedProduct.id
      && Number(product?.stock || 0) > 0
    ));
    const prioritized = visibleProducts.filter((product) => {
      const sameBrand = Boolean(selectedProduct.brand) && product.brand === selectedProduct.brand;
      const productCategories = Array.isArray(product.categories)
        ? product.categories
          .map((category) => {
            if (typeof category === "string") {
              return category.toLowerCase();
            }

            return String(category?.name || "").toLowerCase();
          })
          .filter(Boolean)
        : [];
      const hasSharedCategory = selectedCategories.some((category) => productCategories.includes(category));
      return sameBrand || hasSharedCategory;
    });

    const fallback = visibleProducts.filter((product) => !prioritized.some((item) => item.id === product.id));
    return [...prioritized, ...fallback].slice(0, 12);
  }, [products, selectedProduct]);

  const selectedProductVariants = useMemo(() => {
    if (!selectedProduct) {
      return [];
    }

    return (variantsByProduct[selectedProduct.id] || []).filter((variant) => variant.isActive !== false);
  }, [selectedProduct, variantsByProduct]);

  const selectedProductVariant = useMemo(() => {
    if (!selectedProduct) {
      return null;
    }

    const selectedVariantId = selectedVariantByProduct[selectedProduct.id];
    if (!selectedVariantId) {
      return null;
    }

    return selectedProductVariants.find((variant) => variant.id === selectedVariantId) || null;
  }, [selectedProduct, selectedVariantByProduct, selectedProductVariants]);

  const selectedProductEffectivePrice = useMemo(() => {
    if (!selectedProduct) {
      return 0;
    }

    return Number(selectedProduct.price || 0) + Number(selectedProductVariant?.priceDelta || 0);
  }, [selectedProduct, selectedProductVariant]);

  const selectedProductEffectiveStock = useMemo(() => {
    if (!selectedProduct) {
      return 0;
    }

    if (selectedProductVariant) {
      return Math.max(0, Number(selectedProductVariant.stock || 0));
    }

    return Math.max(0, Number(selectedProduct.stock || 0));
  }, [selectedProduct, selectedProductVariant]);

  function getStockLimit(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    return Math.max(0, Math.floor(parsed));
  }

  function getCartItemStockLimit(item) {
    return getStockLimit(item?.maxStock ?? item?.variantStock ?? item?.stock);
  }

  function isCartItemAtStockLimit(item) {
    const stockLimit = getCartItemStockLimit(item);
    return stockLimit !== null && Number(item?.quantity || 0) >= stockLimit;
  }

  function getCartStockWarningMessage(item, stockLimit) {
    const productName = String(item?.name || "Este producto").trim();

    if (stockLimit <= 0) {
      return `${productName} no tiene mas stock disponible.`;
    }

    if (stockLimit === 1) {
      return `Solo queda 1 unidad de ${productName}.`;
    }

    return `Solo hay ${stockLimit} unidades disponibles de ${productName}.`;
  }

  const isAdmin = auth.user?.role === "admin";
  const analyticsVisitorId = useMemo(() => getOrCreateStorageId("analytics:visitor:id", false), []);
  const analyticsSessionId = useMemo(() => getOrCreateStorageId("analytics:session:id", true), []);
  const lastTrackedPageKeyRef = useRef("");

  function sendAnalytics(eventType, metadata = {}) {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const referrer = document.referrer || "";
    const referrerHost = getReferrerHost(referrer);

    const source = params.get("utm_source") || referrerHost || "directo";
    const medium = params.get("utm_medium") || (referrerHost ? "referral" : "organic");
    const campaign = params.get("utm_campaign") || "";
    const term = params.get("utm_term") || "";
    const content = params.get("utm_content") || "";

    trackAnalyticsEvent({
      eventType,
      visitorId: analyticsVisitorId,
      sessionId: analyticsSessionId,
      path: window.location.pathname,
      url: window.location.href,
      referrer,
      source,
      medium,
      campaign,
      term,
      content,
      language: navigator.language || "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      userAgent: navigator.userAgent || "",
      screenWidth: window.screen?.width || null,
      screenHeight: window.screen?.height || null,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      occurredAt: new Date().toISOString(),
      metadata
    });
  }

  useEffect(() => {
    const pageKey = `${activeSection}|${selectedCategory}|${searchTerm}`;

    if (lastTrackedPageKeyRef.current === pageKey) {
      return;
    }

    lastTrackedPageKeyRef.current = pageKey;

    sendAnalytics("page_view", {
      activeSection,
      selectedCategory,
      hasSearch: Boolean(String(searchTerm || "").trim())
    });
  }, [activeSection, searchTerm, selectedCategory]);

  useEffect(() => {
    if (previousActiveSectionRef.current === activeSection) {
      return;
    }

    previousActiveSectionRef.current = activeSection;
    scrollToPageTop();
  }, [activeSection]);

  useEffect(() => {
    if (!selectedProduct?.id) {
      return;
    }

    sendAnalytics("product_view", {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productBrand: selectedProduct.brand || "",
      productPrice: Number(selectedProduct.price || 0)
    });
  }, [selectedProduct?.id]);

  function mergeCartItems(localCart, backendCart) {
    const merged = new Map();

    for (const item of localCart) {
      const key = item.cartKey || `${item.id}:base`;
      merged.set(key, { ...item, cartKey: key });
    }

    for (const item of backendCart) {
      const key = item.cartKey || `${item.id}:base`;
      const existing = merged.get(key);

      if (existing) {
        existing.quantity = Math.max(existing.quantity || 1, item.quantity || 1);
      } else {
        merged.set(key, { ...item, cartKey: key });
      }
    }

    return Array.from(merged.values());
  }

  function addToCart(product, quantity = 1) {
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    const cartKey = `${product.id}:base`;
    const productImageUrl = getProductImageUrl(product);
    const maxStock = getStockLimit(product.stock);

    const existingItem = cart.find((item) => (item.cartKey || `${item.id}:base`) === cartKey);
    const existingQuantity = existingItem ? Number(existingItem.quantity || 0) : 0;
    const allowedToAdd = maxStock === null ? safeQuantity : Math.max(0, maxStock - existingQuantity);
    const addedQuantity = Math.min(safeQuantity, allowedToAdd);

    if (addedQuantity <= 0) {
      return;
    }

    setCart((currentCart) => {
      const itemIndex = currentCart.findIndex((item) => (item.cartKey || `${item.id}:base`) === cartKey);

      if (itemIndex === -1) {
        return [...currentCart, {
          ...product,
          cartKey,
          variantId: null,
          quantity: addedQuantity,
          maxStock,
          imageUrl: productImageUrl
        }];
      }

      const updated = [...currentCart];
      updated[itemIndex] = {
        ...updated[itemIndex],
        quantity: updated[itemIndex].quantity + addedQuantity,
        maxStock
      };

      return updated;
    });

    setCartStockMessage("");
    setCartStockMessageCartKey("");

    sendAnalytics("add_to_cart", {
      productId: product.id,
      productName: product.name,
      variantId: null,
      quantity: addedQuantity,
      unitPrice: Number(product.price || 0)
    });

    setLastAddedProduct({
      ...product,
      displayName: product.name,
      displayPrice: Number(product.price),
      imageUrl: productImageUrl,
      imageAlt: getProductImageAlt(product, 0)
    });
    setIsAddPopupOpen(true);
    setAddPopupVersion((current) => current + 1);
  }

  function addVariantToCart(product, variant, quantity = 1) {
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    const optionLabel = [variant.presentation, variant.name].filter(Boolean).join(": ");
    const cartKey = `${product.id}:${variant.id}`;
    const unitPrice = Number(product.price || 0) + Number(variant.priceDelta || 0);
    const productImageUrl = getProductImageUrl(product);
    const maxStock = getStockLimit(variant.stock);

    const existingItem = cart.find((item) => (item.cartKey || `${item.id}:base`) === cartKey);
    const existingQuantity = existingItem ? Number(existingItem.quantity || 0) : 0;
    const allowedToAdd = maxStock === null ? safeQuantity : Math.max(0, maxStock - existingQuantity);
    const addedQuantity = Math.min(safeQuantity, allowedToAdd);

    if (addedQuantity <= 0) {
      return;
    }

    setCart((currentCart) => {
      const itemIndex = currentCart.findIndex((item) => (item.cartKey || `${item.id}:base`) === cartKey);

      if (itemIndex === -1) {
        return [
          ...currentCart,
          {
            ...product,
            cartKey,
            variantId: variant.id,
            variantName: variant.name,
            variantPresentation: variant.presentation || "",
            variantStock: maxStock,
            maxStock,
            price: unitPrice,
            quantity: addedQuantity,
            imageUrl: productImageUrl
          }
        ];
      }

      const updated = [...currentCart];
      updated[itemIndex] = {
        ...updated[itemIndex],
        quantity: updated[itemIndex].quantity + addedQuantity,
        variantStock: maxStock,
        maxStock
      };

      return updated;
    });

    setCartStockMessage("");
    setCartStockMessageCartKey("");

    sendAnalytics("add_to_cart", {
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      quantity: addedQuantity,
      unitPrice
    });

    setLastAddedProduct({
      ...product,
      displayName: `${product.name} · ${optionLabel || variant.name}`,
      displayPrice: unitPrice,
      imageUrl: productImageUrl,
      imageAlt: getProductImageAlt(product, 0)
    });
    setIsAddPopupOpen(true);
    setAddPopupVersion((current) => current + 1);
  }

  function updateCartQuantity(cartKey, nextQuantity) {
    let stockWarningMessage = "";

    setCart((currentCart) => {
      const targetItem = currentCart.find((item) => (item.cartKey || `${item.id}:base`) === cartKey);

      if (!targetItem) {
        return currentCart;
      }

      const parsedNextQuantity = Number(nextQuantity);
      const safeNextQuantity = Number.isFinite(parsedNextQuantity)
        ? Math.floor(parsedNextQuantity)
        : Number(targetItem.quantity || 0);
      const stockLimit = getCartItemStockLimit(targetItem);
      const boundedQuantity = stockLimit === null
        ? safeNextQuantity
        : Math.min(safeNextQuantity, stockLimit);

      if (stockLimit !== null && safeNextQuantity > stockLimit) {
        stockWarningMessage = getCartStockWarningMessage(targetItem, stockLimit);
      }

      if (boundedQuantity <= 0) {
        return currentCart.filter((item) => (item.cartKey || `${item.id}:base`) !== cartKey);
      }

      return currentCart.map((item) => (
        (item.cartKey || `${item.id}:base`) === cartKey
          ? {
            ...item,
            quantity: boundedQuantity,
            maxStock: stockLimit ?? item.maxStock ?? null
          }
          : item
      ));
    });

    setCartStockMessage(stockWarningMessage);
    setCartStockMessageCartKey(stockWarningMessage ? cartKey : "");
  }

  function removeFromCart(cartKey) {
    setCartStockMessage("");
    setCartStockMessageCartKey("");
    setCart((currentCart) => currentCart.filter((item) => (item.cartKey || `${item.id}:base`) !== cartKey));
  }

  function clearCart() {
    setCartStockMessage("");
    setCartStockMessageCartKey("");
    setCart([]);
  }

  function handleConfirmClearCart() {
    clearCart();
    setIsClearCartConfirmOpen(false);
  }

  function openCartDrawer() {
    setIsAddPopupOpen(false);
    setIsCartDrawerOpen(true);
  }

  function closeCartDrawer() {
    if (!isCartDrawerOpen || isCartDrawerClosing) return;
    setIsCartDrawerClosing(true);
  }

  function handleCartDrawerCloseAnimationEnd() {
    setIsCartDrawerClosing(false);
    setIsCartDrawerOpen(false);
  }

  function closeAddPopup() {
    setIsAddPopupOpen(false);
  }

  function openLoginModal(view = "register", inviteMessage = "") {
    setAuthError("");
    setLoginModalView(view === "login" ? "login" : "register");
    setLoginInviteMessage(inviteMessage);
    setIsCartDrawerClosing(false);
    setIsCartDrawerOpen(false);
    setIsLoginOpen(true);
  }

  function isProductFavorite(productId) {
    return favoriteProductIds.includes(String(productId));
  }

  function handleToggleFavorite(product, event) {
    event?.stopPropagation();
    event?.preventDefault();

    if (!auth.user) {
      openLoginModal("register", "Registrate o iniciá sesión para guardar productos en favoritos.");
      return;
    }

    const targetId = String(product.id);
    setFavoriteProductIds((current) => (
      current.includes(targetId)
        ? current.filter((id) => id !== targetId)
        : [...current, targetId]
    ));
  }

  function handleOpenFavoritesSection() {
    if (!auth.user) {
      openLoginModal("register", "Registrate o iniciá sesión para guardar y ver tus favoritos.");
      return;
    }

    closeCartDrawer();
    setActiveSection("favorites");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openProductPreview(product) {
    savedCatalogScrollYRef.current = window.scrollY || window.pageYOffset || 0;
    setSelectedProduct(product);
    setSelectedProductImageIndex(0);
    setOpenInfoSection("description");
    setActiveSection("product");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBackFromProduct() {
    const savedY = savedCatalogScrollYRef.current || 0;
    setActiveSection("home");
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: savedY, left: 0, behavior: "smooth" });
    });
  }

  function openCartItemProduct(item) {
    if (!item) {
      return;
    }

    if (item.variantId) {
      setSelectedVariantByProduct((current) => ({
        ...current,
        [item.id]: item.variantId
      }));
    }

    openProductPreview(item);
    closeCartDrawer();
  }

  function handleAddSelectedProductToCart() {
    if (!selectedProduct) {
      return;
    }

    const quantity = getCatalogQuantity(selectedProduct.id);
    if (selectedProductVariant) {
      addVariantToCart(selectedProduct, selectedProductVariant, quantity);
      return;
    }

    addToCart(selectedProduct, quantity);
  }

  function handleBuyNowSelectedProduct() {
    if (!selectedProduct) {
      return;
    }

    const quantity = getCatalogQuantity(selectedProduct.id);
    if (selectedProductVariant) {
      addVariantToCart(selectedProduct, selectedProductVariant, quantity);
    } else {
      addToCart(selectedProduct, quantity);
    }
    setActiveSection("cart");
  }

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    const productId = selectedProduct.id;

    if (variantsByProduct[productId]) {
      return;
    }

    fetchProductVariants(productId)
      .then((data) => {
        setVariantsByProduct((current) => ({
          ...current,
          [productId]: Array.isArray(data.items) ? data.items : []
        }));
      })
      .catch(() => {
        setVariantsByProduct((current) => ({
          ...current,
          [productId]: []
        }));
      });
  }, [selectedProduct, variantsByProduct]);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    const productId = selectedProduct.id;
    const variants = (variantsByProduct[productId] || []).filter((variant) => variant.isActive !== false);
    const selectedVariantId = selectedVariantByProduct[productId];

    if (!variants.length) {
      if (selectedVariantId) {
        setSelectedVariantByProduct((current) => {
          const next = { ...current };
          delete next[productId];
          return next;
        });
      }
      return;
    }

    if (!selectedVariantId || !variants.some((variant) => variant.id === selectedVariantId)) {
      setSelectedVariantByProduct((current) => ({ ...current, [productId]: variants[0].id }));
    }
  }, [selectedProduct, variantsByProduct, selectedVariantByProduct]);

  function handleToggleInfoSection(section) {
    setOpenInfoSection((current) => (current === section ? "" : section));
  }

  function handleGoToCartPage(options = {}) {
    const { openPromotion = false } = options;

    // Verificar si el usuario está autenticado antes de ir al carrito
    if (!auth.token || !auth.user) {
      setLoginInviteMessage("Para continuar con tu compra, necesitamos que te registres. Así podremos enviarte información sobre tu pedido.");
      setLoginModalView("register");
      setIsLoginOpen(true);
      closeCartDrawer();
      return;
    }

    setActiveSection("cart");
    if (openPromotion) {
      setIsCartPromoOpen(true);
      setShouldFocusCartPromoInput(true);
    }
    closeCartDrawer();
  }

  function handleSelectCategory(categoryName) {
    const normalizedCategory = String(categoryName || "Todos los productos").trim() || "Todos los productos";

    if (normalizeSearchText(normalizedCategory) === "ofertas destacadas") {
      handleGoPromotionsSection();
      return;
    }

    sendAnalytics("category_select", {
      categoryName: normalizedCategory
    });

    setSelectedCategory(categoryName || "Todos los productos");
    setSearchInput("");
    setSearchTerm("");
    setActiveSection("home");
    scrollToPageTop();
  }

  function handleSelectBrandFromCarousel(categoryName) {
    handleSelectCategory(categoryName);

    window.requestAnimationFrame(() => {
      const catalogAnchor = document.getElementById("home-catalog-start");
      catalogAnchor?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleSearchSubmit(nextSearchTerm) {
    const normalizedSearch = String(nextSearchTerm || "").trim();

    if (normalizedSearch) {
      sendAnalytics("search", {
        query: normalizedSearch,
        queryLength: normalizedSearch.length
      });
    }

    if (normalizedSearch) {
      setRecentSearches((current) => {
        const normalizedCurrent = current.map((item) => ({
          item,
          key: normalizeSearchText(item)
        }));
        const nextKey = normalizeSearchText(normalizedSearch);
        const withoutCurrent = normalizedCurrent
          .filter((entry) => entry.key && entry.key !== nextKey)
          .map((entry) => entry.item);

        return [normalizedSearch, ...withoutCurrent].slice(0, RECENT_SEARCHES_LIMIT);
      });
    }

    setSearchTerm(normalizedSearch);
    setSearchInput(normalizedSearch);
    setSelectedCategory("Todos los productos");
    setActiveSection("home");
    scrollToPageTop();
  }

  function handleApplySuggestedSearch() {
    if (!suggestedSearchCorrection) {
      return;
    }

    handleSearchSubmit(suggestedSearchCorrection);
  }

  function handleRemoveRecentSearch(searchToRemove) {
    const normalizedToRemove = normalizeSearchText(searchToRemove);

    if (!normalizedToRemove) {
      return;
    }

    setRecentSearches((current) => current.filter((item) => normalizeSearchText(item) !== normalizedToRemove));
  }

  function handleClearRecentSearches() {
    setRecentSearches([]);
  }

  function updateCatalogQuantity(productId, delta, maxQuantity = 99) {
    setCatalogQuantities((current) => {
      const currentValue = Number(current[productId] ?? 1);
      const resolvedMax = Number.isFinite(Number(maxQuantity))
        ? Math.max(1, Math.floor(Number(maxQuantity)))
        : 99;
      const nextValue = Math.max(1, Math.min(resolvedMax, currentValue + delta));
      return { ...current, [productId]: nextValue };
    });
  }

  function getCatalogQuantity(productId) {
    const value = Number(catalogQuantities[productId] ?? 1);
    if (!Number.isFinite(value) || value < 1) {
      return 1;
    }

    return Math.floor(value);
  }

  function scrollProductsRow(direction, rowRef = productsRowRef) {
    if (!rowRef.current) {
      return;
    }

    const firstCard = rowRef.current.querySelector(".product-card");
    const rowStyles = window.getComputedStyle(rowRef.current);
    const rowGap = Number.parseFloat(rowStyles.columnGap || rowStyles.gap || "0") || 0;
    const amountPerCard = firstCard ? firstCard.getBoundingClientRect().width + rowGap : 240;
    const isMobile = window.innerWidth <= 640;
    const amount = amountPerCard * (isMobile ? 2 : 3);

    rowRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth"
    });
  }

  function handleMobileSwipeStart(event) {
    mobileSwipeStartXRef.current = event.touches[0].clientX;
  }

  function handleMobileSwipeEnd(event) {
    if (mobileSwipeStartXRef.current === null) {
      return;
    }

    const deltaX = event.changedTouches[0].clientX - mobileSwipeStartXRef.current;
    mobileSwipeStartXRef.current = null;
    const SWIPE_THRESHOLD = 50;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
      return;
    }

    if (deltaX < 0) {
      setMobileCarouselPage((p) => Math.min(mobileCarouselTotalPages - 1, p + 1));
      setMobileCarouselAnimKey((k) => k + 1);
    } else {
      setMobileCarouselPage((p) => Math.max(0, p - 1));
      setMobileCarouselAnimKey((k) => k + 1);
    }
  }

  function handleSaphirusMobileSwipeStart(event) {
    saphirusMobileSwipeStartXRef.current = event.touches[0].clientX;
  }

  function handleSaphirusMobileSwipeEnd(event) {
    if (saphirusMobileSwipeStartXRef.current === null) {
      return;
    }

    const deltaX = event.changedTouches[0].clientX - saphirusMobileSwipeStartXRef.current;
    saphirusMobileSwipeStartXRef.current = null;
    const SWIPE_THRESHOLD = 50;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
      return;
    }

    if (deltaX < 0) {
      setSaphirusMobileCarouselPage((p) => Math.min(saphirusMobileCarouselTotalPages - 1, p + 1));
      setSaphirusMobileCarouselAnimKey((k) => k + 1);
    } else {
      setSaphirusMobileCarouselPage((p) => Math.max(0, p - 1));
      setSaphirusMobileCarouselAnimKey((k) => k + 1);
    }
  }

  async function handleCheckoutSubmit(event) {
    event.preventDefault();

    if (!cart.length) {
      setCheckoutMessage("El carrito está vacío.");
      return;
    }

    if (!checkoutForm.shippingMethod) {
      setCheckoutMessage("Elegí un método de entrega para continuar.");
      return;
    }

    if (checkoutForm.shippingMethod === "delivery") {
      const errors = validateAddress(checkoutForm);
      if (errors.length > 0) {
        setAddressValidationErrors(errors);
        setCheckoutMessage(errors[0]);
        return;
      }
    }

    const firstName = String(checkoutForm.firstName || "").trim();
    const lastName = String(checkoutForm.lastName || "").trim();
    const joinedName = [firstName, lastName].filter(Boolean).join(" ");

    let resolvedCustomerAddress;
    if (checkoutForm.shippingMethod === "pickup") {
      resolvedCustomerAddress = "Retiro en el local - Acevedo 200";
    } else {
      const parts = [checkoutForm.street.trim(), checkoutForm.number.trim()].filter(Boolean).join(" ");
      const extra = [
        checkoutForm.floor.trim() ? `Piso ${checkoutForm.floor.trim()}` : "",
        checkoutForm.apartment.trim() ? `Depto ${checkoutForm.apartment.trim()}` : "",
      ].filter(Boolean).join(", ");
      resolvedCustomerAddress = extra ? `${parts}, ${extra}` : parts;
    }

    if (checkoutForm.shippingMethod === "delivery" && !resolvedCustomerAddress) {
      setCheckoutMessage("La dirección es obligatoria para concretar la compra.");
      return;
    }

    setIsCheckoutLoading(true);
    setCheckoutMessage("");
    setAddressValidationErrors([]);

    sendAnalytics("begin_checkout", {
      cartItemsCount: cart.length,
      cartSubtotal,
      shippingMethod: checkoutForm.shippingMethod,
      shippingZone: checkoutForm.shippingMethod === "delivery" ? checkoutForm.shippingZone : null,
      shippingCost: checkoutShippingCost,
      total: checkoutTotal
    });

    try {
      const shippingZone = checkoutForm.shippingMethod === "delivery"
        ? checkoutForm.shippingZone
        : null;
      const customerName = String(joinedName || checkoutForm.customerName || auth.user?.name || "Cliente web").trim();
      const customerPhone = String(checkoutForm.customerPhone || auth.user?.phone || "").trim();
      const contactEmail = String(auth.user?.email || "").trim();

      const payload = {
        customerName,
        customerPhone,
        contactEmail,
        customerAddress: resolvedCustomerAddress,
        shippingCity: checkoutForm.shippingMethod === "delivery" ? checkoutForm.city.trim() : null,
        shippingState: checkoutForm.shippingMethod === "delivery" ? checkoutForm.province.trim() : null,
        shippingPostalCode: checkoutForm.shippingMethod === "delivery" ? checkoutForm.postalCode.trim() : null,
        customerNote: checkoutForm.notes.trim() || null,
        shippingMethod: checkoutForm.shippingMethod,
        shippingZone,
        paymentMethod: checkoutForm.shippingMethod === "pickup" ? checkoutForm.paymentMethod : "mercadopago",
        promoCode: appliedCartPromotion?.code || null,
        items: cart.map((item) => ({
          productId: item.id,
          variantId: item.variantId || null,
          quantity: item.quantity
        }))
      };

      const result = await checkoutCart(payload, auth.token);

      if (payload.paymentMethod === "cash") {
        // Cash on delivery — no MP redirect, show success
        clearCart();
        setCheckoutMessage(`¡Pedido #${result?.item?.id} confirmado! Te enviamos un email con los detalles. Abonarás al retirar en el local.`);
        setActiveSection("home");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const checkoutUrl = String(result?.payment?.checkoutUrl || "").trim();

        if (!checkoutUrl) {
          throw new Error("No se pudo generar el link de pago con Mercado Pago");
        }

        setCheckoutMessage("Redirigiendo a Mercado Pago...");
        window.location.assign(checkoutUrl);
      }
    } catch (error) {
      setCheckoutMessage(error.message);
    } finally {
      setIsCheckoutLoading(false);
    }
  }

  function handleOpenCheckoutDetails() {
    if (!cart.length) {
      setCheckoutMessage("El carrito está vacío.");
      return;
    }

    // Verificar si el usuario está autenticado antes de continuar al checkout
    if (!auth.token || !auth.user) {
      setLoginInviteMessage("Para finalizar tu compra, necesitamos que te registres. Así podremos contactarte sobre tu pedido.");
      setLoginModalView("register");
      setIsLoginOpen(true);
      return;
    }

    setCheckoutMessage("");
    setActiveSection("checkout-details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleApplyCartPromotion() {
    const normalizedCode = String(cartPromoCode || "").trim();

    if (!normalizedCode) {
      setCartPromoMessage("Ingresá un código promocional.");
      return;
    }

    if (!cart.length) {
      setCartPromoMessage("El carrito está vacío.");
      return;
    }

    setIsApplyingCartPromo(true);
    setCartPromoMessage("");

    try {
      const result = await applyPromotion(
        normalizedCode,
        cartSubtotal,
        cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: Number(item.price || 0)
        })),
        auth.token
      );

      setAppliedCartPromotion({
        code: String(result.code || normalizedCode).toUpperCase(),
        promotionName: String(result.promotionName || "").trim(),
        discount: Number(result.discount || 0)
      });
      setCartPromoMessage(`Cupón aplicado: -$${Number(result.discount || 0).toLocaleString("es-AR")} ARS`);
    } catch (error) {
      setAppliedCartPromotion(null);
      setCartPromoMessage(error.message || "No se pudo aplicar el cupón");
    } finally {
      setIsApplyingCartPromo(false);
    }
  }

  function handleSaveCartNote() {
    const normalizedNote = String(cartOrderNote || "").trim();

    if (!normalizedNote) {
      setCartNoteMessage("Escribí una nota antes de guardar.");
      return;
    }

    setCartNoteMessage("Nota guardada correctamente.");
  }

  async function handleLogin(authPayload) {
    const mode = authPayload?.mode === "register" ? "register" : "login";
    const email = String(authPayload?.email || "").trim();
    const password = String(authPayload?.password || "");
    const name = String(authPayload?.name || "").trim();
    const phone = String(authPayload?.phone || "").trim();
    const address = String(authPayload?.address || "").trim();

    setIsAuthLoading(true);
    setAuthError("");

    try {
      const data = mode === "register"
        ? await register(name, email, password, phone, address)
        : await login(email, password);

      // Check if verification is required
      if (data.requiresVerification) {
        setVerificationEmail(email);
        setLoginModalView("verify");
        setAuthError("");
        setIsAuthLoading(false);
        return;
      }

      const storedAddressData = readStoredAddressBook(data.user || {});
      const hasStoredBook = storedAddressData.addressBook.length > 0;
      const validPrimaryAddressId = hasStoredBook
        ? (storedAddressData.addressBook.some((entry) => entry.id === storedAddressData.primaryAddressId)
          ? storedAddressData.primaryAddressId
          : storedAddressData.addressBook[0]?.id || "")
        : "";
      const primaryEntry = hasStoredBook
        ? (storedAddressData.addressBook.find((entry) => entry.id === validPrimaryAddressId) || storedAddressData.addressBook[0])
        : null;
      const userWithAddresses = {
        ...(data.user || {}),
        address: primaryEntry ? buildAddressFromEntry(primaryEntry) : String(data.user?.address || "").trim(),
        addressBook: hasStoredBook ? storedAddressData.addressBook : (Array.isArray(data.user?.addressBook) ? data.user.addressBook : []),
        primaryAddressId: hasStoredBook ? validPrimaryAddressId : String(data.user?.primaryAddressId || "").trim()
      };

      let nextCart = [];

      if (data.token) {
        const cartResponse = await fetchUserCart(data.token);
        const backendCart = Array.isArray(cartResponse?.items) ? cartResponse.items : [];
        const localCart = Array.isArray(cart) ? cart : [];

        if (backendCart.length > 0 && localCart.length > 0) {
          nextCart = mergeCartItems(localCart, backendCart);
        } else if (backendCart.length > 0) {
          nextCart = backendCart;
        } else {
          nextCart = localCart;
        }

        if (nextCart.length > 0) {
          saveUserCart(data.token, nextCart).catch(() => {});
        }
      }

      sendAnalytics(mode === "register" ? "register" : "login", {
        role: userWithAddresses?.role || "client",
        emailDomain: String(email || "").includes("@") ? String(email).split("@").pop() : ""
      });
      setCart(nextCart);
      setAuth({ token: data.token, user: userWithAddresses });
      localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      localStorage.removeItem("cart");
      if (userWithAddresses?.role === "admin") {
        setActiveSection("admin");
        await Promise.all([
          refreshOrders(data.token),
          refreshAdminData(data.token),
          refreshTicketsData(data.token, userWithAddresses.role)
        ]);
      } else {
        await refreshTicketsData(data.token, userWithAddresses?.role || "client");
      }
      setIsLoginOpen(false);
      setLoginInviteMessage("");
      setVerificationEmail("");
    } catch (error) {
      // User exists but never verified their email — send them to the verify view
      if (error.notVerified) {
        setVerificationEmail(error.email || "");
        setLoginModalView("verify");
        setAuthError("Tu cuenta no fue verificada. Ingresá el código que te enviamos por mail o reenvialo.");
        setIsAuthLoading(false);
        return;
      }
      setAuthError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleVerifyEmail(email, code) {
    setIsAuthLoading(true);
    setAuthError("");

    try {
      const data = await verifyEmail(email, code);

      const storedAddressData = readStoredAddressBook(data.user || {});
      const hasStoredBook = storedAddressData.addressBook.length > 0;
      const validPrimaryAddressId = hasStoredBook
        ? (storedAddressData.addressBook.some((entry) => entry.id === storedAddressData.primaryAddressId)
          ? storedAddressData.primaryAddressId
          : storedAddressData.addressBook[0]?.id || "")
        : "";
      const primaryEntry = hasStoredBook
        ? (storedAddressData.addressBook.find((entry) => entry.id === validPrimaryAddressId) || storedAddressData.addressBook[0])
        : null;
      const userWithAddresses = {
        ...(data.user || {}),
        address: primaryEntry ? buildAddressFromEntry(primaryEntry) : String(data.user?.address || "").trim(),
        addressBook: hasStoredBook ? storedAddressData.addressBook : (Array.isArray(data.user?.addressBook) ? data.user.addressBook : []),
        primaryAddressId: hasStoredBook ? validPrimaryAddressId : String(data.user?.primaryAddressId || "").trim()
      };

      let nextCart = [];

      if (data.token) {
        const cartResponse = await fetchUserCart(data.token);
        const backendCart = Array.isArray(cartResponse?.items) ? cartResponse.items : [];
        const localCart = Array.isArray(cart) ? cart : [];

        if (backendCart.length > 0 && localCart.length > 0) {
          nextCart = mergeCartItems(localCart, backendCart);
        } else if (backendCart.length > 0) {
          nextCart = backendCart;
        } else {
          nextCart = localCart;
        }

        if (nextCart.length > 0) {
          saveUserCart(data.token, nextCart).catch(() => {});
        }
      }

      sendAnalytics("email_verified", {
        role: userWithAddresses?.role || "client"
      });

      setCart(nextCart);
      setAuth({ token: data.token, user: userWithAddresses });
      localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      localStorage.removeItem("cart");
      await refreshTicketsData(data.token, userWithAddresses?.role || "client");
      setIsLoginOpen(false);
      setLoginInviteMessage("");
      setVerificationEmail("");

      // Always show welcome modal after email verification
      setTimeout(() => {
        setIsWelcomeDiscountModalOpen(true);
      }, 500);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleResendVerificationCode(email) {
    setIsAuthLoading(true);
    setAuthError("");

    try {
      await resendVerificationCode(email);
      setAuthError("Código reenviado. Revisá tu email.");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleForgotPassword(email) {
    setIsAuthLoading(true);
    setAuthError("");

    try {
      await forgotPassword(email);
      // Don't set loginModalView here - modal handles its own transition
    } catch (error) {
      setAuthError(error.message);
      throw error; // re-throw so LoginModal knows not to transition
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleResetPassword(email, code, newPassword) {
    setIsAuthLoading(true);
    setAuthError("");

    try {
      await resetPassword(email, code, newPassword);
      setAuthError("¡Contraseña cambiada! Ya podés iniciar sesión.");
      setLoginModalView("login");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  }

  function handleLogout() {
    if (auth.token && auth.user) {
      saveUserCart(auth.token, cart).catch(() => {});
    }

    clearCart();
    setAuth({ token: null, user: null });
    setActiveSection("home");
    setAdminMessage("");
    setAnalyticsData(null);
    localStorage.removeItem("cart");
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    localStorage.removeItem(CART_STORAGE_KEY);
  }

  async function handleReloadAdminAnalytics(period = "30d") {
    if (!auth.token) {
      return;
    }

    try {
      await refreshAdminAnalytics(auth.token, period);
      setAdminMessage("Analíticas actualizadas correctamente");
    } catch (error) {
      setAdminMessage(error.message);
      throw error;
    }
  }

  async function handleSaveAddress(addressValue) {
    const normalizedAddress = String(addressValue || "").trim();

    if (!auth.token || !auth.user) {
      throw new Error("Iniciá sesión para guardar tu dirección.");
    }

    const hasAddressBookPayload = Boolean(addressValue && typeof addressValue === "object" && Array.isArray(addressValue.addresses));

    let nextAddressBook = [];
    let nextPrimaryAddressId = "";
    let primaryAddress = normalizedAddress;

    if (hasAddressBookPayload) {
      nextAddressBook = addressValue.addresses
        .map((entry, index) => normalizeAddressBookEntry(entry, `addr-${index + 1}`))
        .filter((entry) => entry.street || entry.height)
        .slice(0, MAX_ACCOUNT_ADDRESSES);

      if (!nextAddressBook.length) {
        throw new Error("Agregá al menos una dirección válida.");
      }

      if (addressValue.addresses.length > MAX_ACCOUNT_ADDRESSES) {
        throw new Error(`Podés guardar hasta ${MAX_ACCOUNT_ADDRESSES} direcciones.`);
      }

      const requestedPrimaryAddressId = String(addressValue.primaryAddressId || "").trim();
      nextPrimaryAddressId = nextAddressBook.some((entry) => entry.id === requestedPrimaryAddressId)
        ? requestedPrimaryAddressId
        : nextAddressBook[0].id;

      const primaryEntry = nextAddressBook.find((entry) => entry.id === nextPrimaryAddressId) || nextAddressBook[0];
      primaryAddress = buildAddressFromEntry(primaryEntry);
    }

    if (!primaryAddress) {
      throw new Error("La dirección es obligatoria.");
    }

    const data = await updateMyAddress(auth.token, primaryAddress);
    setAuth((current) => ({
      token: data.token || current.token,
      user: {
        ...(current.user || {}),
        ...(data.user || {}),
        address: data.user?.address || primaryAddress,
        addressBook: hasAddressBookPayload ? nextAddressBook : (Array.isArray(current.user?.addressBook) ? current.user.addressBook : []),
        primaryAddressId: hasAddressBookPayload
          ? nextPrimaryAddressId
          : String(current.user?.primaryAddressId || "").trim()
      }
    }));

    return {
      ...(data.user || {}),
      addressBook: hasAddressBookPayload ? nextAddressBook : undefined,
      primaryAddressId: hasAddressBookPayload ? nextPrimaryAddressId : undefined
    };
  }

  async function handleSaveProfile(profilePayload) {
    if (!auth.token || !auth.user) {
      throw new Error("Iniciá sesión para actualizar tu cuenta.");
    }

    const data = await updateMyProfile(auth.token, profilePayload);

    setAuth((current) => ({
      token: data.token || current.token,
      user: {
        ...(current.user || {}),
        ...(data.user || {})
      }
    }));

    return data.user;
  }

  function handleOpenMyAccount() {
    if (!auth.user) {
      openLoginModal("login");
      return;
    }

    setAccountInitialTab("cuenta");
    setActiveSection("account");
  }

  function handleOpenMyAddress() {
    if (!auth.user) {
      openLoginModal("login");
      return;
    }

    setAccountInitialTab("direccion");
    setActiveSection("account");
  }

  function handleFooterMobileTabChange(tabId) {
    if (tabId === "account" && !auth.user) {
      openLoginModal("login", "Iniciá sesión para acceder a Mi Cuenta.");
      return;
    }

    setActiveFooterMobileTab(tabId);
  }

  function handleFooterAccountLinkClick(tabKey) {
    if (!auth.user) {
      openLoginModal("login", "Iniciá sesión para acceder a tu cuenta.");
      return;
    }

    if (tabKey === "favoritos") {
      setActiveSection("favorites");
    } else {
      setAccountInitialTab(tabKey);
      setActiveSection("account");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCreateProduct(payload) {
    try {
      await createProduct(auth.token, payload);
      await refreshProducts();
      setAdminMessage("Producto agregado correctamente");
    } catch (error) {
      setAdminMessage(error.message);
      throw error;
    }
  }

  async function handleUpdateProduct(productId, payload) {
    try {
      await updateProduct(auth.token, productId, payload);
      await refreshProducts();
      setAdminMessage("Producto actualizado correctamente");
    } catch (error) {
      setAdminMessage(error.message);
      throw error;
    }
  }

  async function handleUploadProductMedia(files, productName) {
    try {
      const data = await uploadProductMedia(auth.token, files, productName);
      setAdminMessage("");
      return data.items || [];
    } catch (error) {
      setAdminMessage(error.message);
      throw error;
    }
  }

  async function handleDeleteProduct(productId) {
    try {
      await deleteProduct(auth.token, productId);
      await refreshProducts();
      setAdminMessage("Producto eliminado correctamente");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function handleRepeatOrder(order) {
    if (!order?.lines?.length) return;
    const repeatableLines = order.lines.filter((l) => l.productId);
    if (!repeatableLines.length) return;

    const productMap = new Map((products || []).map((p) => [p.id, p]));
    let addedCount = 0;

    for (const line of repeatableLines) {
      const product = productMap.get(line.productId);
      if (!product) continue;
      const qty = Number(line.quantity) || 1;
      if (line.variantId) {
        const variants = variantsByProduct[product.id];
        const variant = Array.isArray(variants) ? variants.find((v) => v.id === line.variantId) : null;
        if (variant) {
          addVariantToCart(product, variant, qty);
        } else {
          addToCart(product, qty);
        }
      } else {
        addToCart(product, qty);
      }
      addedCount++;
    }

    if (addedCount > 0) {
      openCartDrawer();
    }
  }

  async function handleOrderStatusChange(orderId, status, opts = {}) {
    try {
      await updateOrderStatus(auth.token, orderId, status, opts);
      await refreshOrders(auth.token);
      refreshServerNotifications(auth.token);
      setAdminMessage("Estado de pedido actualizado");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function handleMarkNotificationRead(notifId) {
    try {
      await markNotificationRead(auth.token, notifId);
      setServerNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    } catch {
      /* ignore */
    }
  }

  async function handleMarkAllNotificationsRead() {
    try {
      await markAllNotificationsRead(auth.token);
      setServerNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationsCount(0);
    } catch {
      /* ignore */
    }
  }

  async function handleEnsureOrderInvoice(orderId) {
    try {
      const data = await ensureOrderInvoice(auth.token, orderId);
      return data.item || null;
    } catch (error) {
      setAdminMessage(error.message);
      throw error;
    }
  }

  async function handleLoadVariants(productId) {
    try {
      const data = await fetchProductVariants(productId);
      setVariantsByProduct((current) => ({ ...current, [productId]: data.items || [] }));
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function handleCreateVariant(productId, payload) {
    try {
      await createProductVariant(auth.token, productId, payload);
      await handleLoadVariants(productId);
      await refreshAdminData(auth.token);
      setAdminMessage("Variante creada correctamente");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function handleDeleteVariant(productId, variantId) {
    try {
      await deleteProductVariant(auth.token, productId, variantId);
      await handleLoadVariants(productId);
      await refreshAdminData(auth.token);
      setAdminMessage("Variante eliminada correctamente");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function handleUpdateShippingRule(ruleId, payload) {
    try {
      await updateShippingRule(auth.token, ruleId, payload);
      await refreshAdminData(auth.token);
      setAdminMessage("Regla de envío actualizada");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function handleCreateCategory(name) {
    try {
      await createAdminCategory(auth.token, { name });
      await refreshAdminData(auth.token);
      setAdminMessage("Categoría creada correctamente");
    } catch (error) {
      setAdminMessage(error.message);
      throw error;
    }
  }

  async function handleDeleteCategory(categoryId) {
    try {
      await deleteAdminCategory(auth.token, categoryId);
      await Promise.all([refreshAdminData(auth.token), refreshProducts()]);
      setAdminMessage("Categoría eliminada correctamente");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function handleUpdateCategory(categoryId, name) {
    try {
      await updateAdminCategory(auth.token, categoryId, { name });
      await Promise.all([refreshAdminData(auth.token), refreshProducts()]);
      setAdminMessage("Categoría actualizada correctamente");
    } catch (error) {
      setAdminMessage(error.message);
      throw error;
    }
  }

  async function handleCreatePromotion(payload) {
    try {
      await createPromotion(auth.token, payload);
      await refreshAdminData(auth.token);
      setAdminMessage("Promoción creada correctamente");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function handleApplyPromotion(code, subtotal, items) {
    try {
      const result = await applyPromotion(code, subtotal, items, auth.token);
      setAdminMessage(`Cupón aplicado: descuento $${result.discount.toLocaleString("es-AR")}`);
      return result;
    } catch (error) {
      setAdminMessage(error.message);
      throw error;
    }
  }

  async function handleCopyWelcomePromoCode() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(WELCOME_PROMO_CODE);
      }

      setCartPromoCode(WELCOME_PROMO_CODE);
      setWelcomePromoMessage("Código copiado");
    } catch {
      setWelcomePromoMessage("Copiá manualmente el código PRIMERACOMPRA10");
    }
  }

  async function handleQuoteShipping(zone, subtotal) {
    try {
      const result = await quoteShipping(zone, subtotal);
      setAdminMessage(`Envío ${zone}: $${Number(result.shippingCost).toLocaleString("es-AR")}`);
      return result;
    } catch (error) {
      setAdminMessage(error.message);
      throw error;
    }
  }

  async function handleLoadCustomerReorder(customerId) {
    try {
      const data = await fetchCustomerReorderItems(auth.token, customerId);
      setReorderItemsByCustomer((current) => ({ ...current, [customerId]: data.items || [] }));
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function handleLoadCustomerActivity(customerId) {
    try {
      const data = await fetchCustomerActivity(auth.token, customerId);
      setCustomerActivityByCustomer((current) => ({ ...current, [customerId]: data.items || [] }));
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function handleDeleteMember(memberId) {
    await deleteMember(auth.token, memberId);
    setMembers((current) => current.filter((m) => m.id !== memberId));
  }

  async function handleDeleteMembersBulk(ids) {
    await deleteMembersBulk(auth.token, ids);
    const deletedSet = new Set(ids);
    setMembers((current) => current.filter((m) => !deletedSet.has(m.id)));
  }

  async function handleReloadTickets() {
    if (!auth.token || !auth.user) {
      return;
    }

    try {
      await refreshTicketsData(auth.token, auth.user.role);
      setAdminMessage("");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function handleCreateTicket(payload, files) {
    const result = await createTicket(auth.token, payload, files);
    await refreshTicketsData(auth.token, auth.user?.role || "client");
    if (auth.user?.role === "admin") {
      setAdminMessage(result?.notification?.message || "Ticket creado correctamente");
    }
    return result;
  }

  async function handleUpdateTicket(ticketRef, payload) {
    const result = await updateTicket(auth.token, ticketRef, payload);
    await refreshTicketsData(auth.token, auth.user?.role || "client");
    if (auth.user?.role === "admin") {
      setAdminMessage(result?.notification?.message || "Ticket actualizado");
    }
    return result;
  }

  async function handleAddTicketComment(ticketRef, payload, files) {
    const result = await addTicketComment(auth.token, ticketRef, payload, files);
    await refreshTicketsData(auth.token, auth.user?.role || "client");
    if (auth.user?.role === "admin") {
      setAdminMessage(result?.notification?.message || "Comentario agregado");
    }
    return result;
  }

  async function handleCloseTicket(ticketRef) {
    const result = await closeTicket(auth.token, ticketRef);
    await refreshTicketsData(auth.token, auth.user?.role || "client");
    if (auth.user?.role === "admin") {
      setAdminMessage(result?.notification?.message || "Ticket cerrado");
    }
    return result;
  }

  async function handleDeleteTicket(ticketRef) {
    const result = await deleteTicket(auth.token, ticketRef);
    await refreshTicketsData(auth.token, auth.user?.role || "client");
    if (auth.user?.role === "admin") {
      setAdminMessage(result?.notification?.message || "Ticket borrado");
    }
    return result;
  }

  const isSpecificCategorySelected = selectedCategory && selectedCategory !== "Todos los productos";
  const currentSearchLabel = searchTerm.trim();
  const isSearchActive = Boolean(currentSearchLabel);
  const catalogHeading = isSearchActive
    ? `Resultados para "${currentSearchLabel}"`
    : isSpecificCategorySelected
      ? selectedCategory
      : "Catálogo principal";
  const catalogSubtitle = isSearchActive
    ? "Estos son los productos que coinciden con tu búsqueda."
    : "Elegí tus productos, ajustá la cantidad y agregalos al carrito en un clic.";
  const isInicioActive = activeSection === "home" && !isSpecificCategorySelected && !isSearchActive;
  const isPromotionsActive = activeSection === "promotions";
  const isAboutActive = activeSection === "about";
  const shouldRenderGridProducts = isSpecificCategorySelected || isSearchActive;
  const homeRandomProducts = useMemo(() => {
    if (!isInicioActive) {
      return [];
    }

    const inStockProducts = filteredProducts.filter((product) => Number(product?.stock || 0) > 0);
    const shuffledProducts = [...inStockProducts];

    for (let index = shuffledProducts.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffledProducts[index], shuffledProducts[randomIndex]] = [shuffledProducts[randomIndex], shuffledProducts[index]];
    }

    return shuffledProducts;
  }, [isInicioActive, filteredProducts]);
  const productsForCarousel = isInicioActive ? homeRandomProducts : filteredProducts;
  const MOBILE_CAROUSEL_PAGE_SIZE = 2;
  const mobileCarouselTotalPages = Math.max(1, Math.ceil(productsForCarousel.length / MOBILE_CAROUSEL_PAGE_SIZE));
  const safeMobileCarouselPage = Math.min(mobileCarouselPage, mobileCarouselTotalPages - 1);
  const mobileCarouselStart = safeMobileCarouselPage * MOBILE_CAROUSEL_PAGE_SIZE;
  const saphirusMobileCarouselTotalPages = Math.max(1, Math.ceil(saphirusGalleryProducts.length / MOBILE_CAROUSEL_PAGE_SIZE));
  const safeSaphirusMobileCarouselPage = Math.min(saphirusMobileCarouselPage, saphirusMobileCarouselTotalPages - 1);
  const saphirusMobileCarouselStart = safeSaphirusMobileCarouselPage * MOBILE_CAROUSEL_PAGE_SIZE;
  const visibleCategoryProducts = isSpecificCategorySelected
    ? sortedFilteredProducts.slice(0, categoryVisibleCount)
    : sortedFilteredProducts;
  const visibleSearchProducts = isSearchActive
    ? sortedFilteredProducts.slice(0, searchVisibleCount)
    : sortedFilteredProducts;
  const visibleGridProducts = isSearchActive
    ? visibleSearchProducts
    : (isSpecificCategorySelected ? visibleCategoryProducts : sortedFilteredProducts);
  const canLoadMoreCategoryProducts = isSpecificCategorySelected && !isSearchActive && sortedFilteredProducts.length > categoryVisibleCount;
  const canLoadMoreSearchProducts = isSearchActive && sortedFilteredProducts.length > searchVisibleCount;
  const hasCatalogProductsToRender = shouldRenderGridProducts
    ? filteredProducts.length > 0
    : productsForCarousel.length > 0;
  const [seoExpanded, setSeoExpanded] = useState(false);
  const catalogSeoSummary = useMemo(() => {
    if (isSearchActive) {
      return `Resultados de limpieza para "${currentSearchLabel}". Encontrá opciones para hogar y comercio con stock actualizado, promociones y envío rápido.`;
    }

    if (isSpecificCategorySelected) {
      return `Explorá ${selectedCategory} en La Boutique de la Limpieza. Compará marcas, presentaciones y precios para comprar online con entrega rápida.`;
    }

    return "Catálogo de productos de limpieza para hogar, comercio e industria ligera con envíos y promociones semanales.";
  }, [isSearchActive, currentSearchLabel, isSpecificCategorySelected, selectedCategory]);
  const topCatalogCategories = useMemo(() => {
    const map = new Map();

    for (const product of products) {
      const categoriesList = Array.isArray(product?.categories) ? product.categories : [];
      for (const category of categoriesList) {
        const name = String(category || "").trim();
        if (!name) {
          continue;
        }

        map.set(name, (map.get(name) || 0) + 1);
      }
    }

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [products]);

    useEffect(() => {
      const existingCatalogScript = document.getElementById("catalog-seo-jsonld");
      if (existingCatalogScript) {
        existingCatalogScript.remove();
      }

      if (activeSection !== "home" || (!isSpecificCategorySelected && !isSearchActive)) {
        return;
      }

      const siteName = "La Boutique de la Limpieza";
      const baseTitle = isSearchActive
        ? `${currentSearchLabel} | Resultados de limpieza | ${siteName}`
        : `${selectedCategory} | Catálogo de limpieza | ${siteName}`;
      const title = baseTitle.length > 68 ? `${baseTitle.slice(0, 68).trim()}...` : baseTitle;
      const description = catalogSeoSummary;
      const robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
      const query = new URLSearchParams(window.location.search);

      if (isSearchActive) {
        query.set("q", currentSearchLabel);
        query.delete("categoria");
      } else {
        query.set("categoria", toSeoSlug(selectedCategory));
        query.delete("q");
      }

      const canonicalHref = `${window.location.origin}${window.location.pathname}?${query.toString()}`;

      const upsertMeta = (attrName, key, content) => {
        if (!content) {
          return;
        }

        let element = document.head.querySelector(`meta[${attrName}="${key}"]`);
        if (!element) {
          element = document.createElement("meta");
          element.setAttribute(attrName, key);
          document.head.appendChild(element);
        }

        element.setAttribute("content", content);
      };

      let canonicalLink = document.head.querySelector("link[rel='canonical']");
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalLink);
      }

      document.title = title;
      canonicalLink.setAttribute("href", canonicalHref);
      upsertMeta("name", "description", description);
      upsertMeta("name", "robots", robots);
      upsertMeta("property", "og:type", "website");
      upsertMeta("property", "og:title", title);
      upsertMeta("property", "og:description", description);
      upsertMeta("property", "og:url", canonicalHref);
      upsertMeta("name", "twitter:title", title);
      upsertMeta("name", "twitter:description", description);

      const itemListElements = visibleGridProducts.slice(0, 24).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${window.location.origin}${window.location.pathname}?producto=${encodeURIComponent(getProductSeoSlug(product))}`,
        name: String(product?.name || "Producto")
      }));

      const catalogScript = document.createElement("script");
      catalogScript.id = "catalog-seo-jsonld";
      catalogScript.type = "application/ld+json";
      catalogScript.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description,
        url: canonicalHref,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: itemListElements.length,
          itemListElement: itemListElements
        }
      });
      document.head.appendChild(catalogScript);

      return () => {
        const scriptElement = document.getElementById("catalog-seo-jsonld");
        if (scriptElement) {
          scriptElement.remove();
        }
      };
    }, [
      activeSection,
      isSpecificCategorySelected,
      isSearchActive,
      currentSearchLabel,
      selectedCategory,
      catalogSeoSummary,
      visibleGridProducts
    ]);
  const userAddressBook = Array.isArray(auth.user?.addressBook)
    ? auth.user.addressBook
      .map((entry, index) => normalizeAddressBookEntry(entry, `addr-${index + 1}`))
      .filter((entry) => entry.street || entry.height)
    : [];
  const currentPrimaryAddressId = String(auth.user?.primaryAddressId || "").trim();
  const selectedPrimaryAddress = userAddressBook.find((entry) => entry.id === currentPrimaryAddressId) || userAddressBook[0] || null;
  const normalizedUserAddress = String(auth.user?.address || "").trim();
  const shippingAddressLabel = selectedPrimaryAddress
    ? formatAddressForMenu(selectedPrimaryAddress)
    : normalizedUserAddress
      ? formatAddressForMenu(normalizedUserAddress)
    : (/gaston/i.test(String(auth.user?.name || "")) || /gasto/i.test(String(auth.user?.email || ""))
      ? "Murillo 1121"
      : "");
  const shippingButtonLabel = shippingAddressLabel || "Elegí tu zona de envío";
  const memberFirstName = toNameCase(auth.user?.firstName);
  const memberLastName = toNameCase(auth.user?.lastName);
  const promotionsMemberName = [memberFirstName, memberLastName].filter(Boolean).join(" ")
    || toNameCase(auth.user?.name)
    || "Miembro";
  const seenAdminNotificationIdSet = useMemo(
    () => new Set(seenAdminNotificationIds),
    [seenAdminNotificationIds]
  );
  const adminNotifications = useMemo(() => {
    if (!isAdmin) {
      return [];
    }

    const orderNotifications = (Array.isArray(orders) ? orders : [])
      .slice(0, 25)
      .map((order) => ({
        id: `admin-order-${order.id}`,
        kind: "order",
        orderId: order.id,
        title: `${order.customerName || "Cliente"} concretó un pedido por ${formatArsAmount(order.total)}.`,
        actionLabel: "Ver pedido",
        createdAt: order.createdAt || null
      }));

    const invoiceNotifications = (Array.isArray(orders) ? orders : [])
      .filter((order) => isOrderPaid(order))
      .slice(0, 25)
      .map((order) => ({
        id: `admin-invoice-${order.id}`,
        kind: "invoice",
        orderId: order.id,
        title: `${order.customerName || "Cliente"} pagó ${formatArsAmount(order.total)} por la factura del pedido n.º ${order.wixOrderNumber || order.id}.`,
        actionLabel: "Ver factura",
        createdAt: order.createdAt || null
      }));

    const outOfStockProducts = (lowStockAlerts?.productAlerts || []).filter((item) => Number(item?.stock || 0) <= 0);
    const outOfStockVariants = (lowStockAlerts?.variantAlerts || []).filter((item) => Number(item?.stock || 0) <= 0);

    const stockNotifications = [
      ...outOfStockProducts.map((item) => ({
        id: `admin-stock-product-${item.id}`,
        kind: "stock",
        title: `Producto agotado: ${item.name || "Sin nombre"}.`,
        actionLabel: "Ver productos",
        createdAt: null
      })),
      ...outOfStockVariants.map((item) => ({
        id: `admin-stock-variant-${item.id}`,
        kind: "stock",
        title: `Variante agotada: ${item.productName || "Producto"} · ${item.name || "Variante"}.`,
        actionLabel: "Ver productos",
        createdAt: null
      }))
    ];

    return [...orderNotifications, ...invoiceNotifications, ...stockNotifications]
      .sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [isAdmin, lowStockAlerts, orders]);
  const unseenAdminNotificationsCount = adminNotifications.filter(
    (notification) => !seenAdminNotificationIdSet.has(notification.id)
  ).length;
  const adminNotificationsBadgeText = unseenAdminNotificationsCount > 99
    ? "99+"
    : String(unseenAdminNotificationsCount);
  const visibleAdminNotifications = adminNotifications.slice(0, 8);
  const prevUnseenCountRef = useRef(unseenAdminNotificationsCount);
  const prevServerUnreadRef = useRef(unreadNotificationsCount);

  useEffect(() => {
    const prevUnseen = prevUnseenCountRef.current;
    const prevServer = prevServerUnreadRef.current;
    prevUnseenCountRef.current = unseenAdminNotificationsCount;
    prevServerUnreadRef.current = unreadNotificationsCount;

    const grew = unseenAdminNotificationsCount > prevUnseen || unreadNotificationsCount > prevServer;
    if (!grew || !isAdmin) return;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      osc.onended = () => ctx.close();
    } catch { /* audio not available */ }
  }, [unseenAdminNotificationsCount, unreadNotificationsCount, isAdmin]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(
        ADMIN_NOTIFICATIONS_SEEN_STORAGE_KEY,
        JSON.stringify(seenAdminNotificationIds)
      );
    } catch {}
  }, [seenAdminNotificationIds]);

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    setIsAdminNotificationsOpen(false);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdminNotificationsOpen || !adminNotifications.length) {
      return;
    }

    setSeenAdminNotificationIds((current) => {
      const currentSet = new Set(current);
      let hasChanges = false;

      for (const notification of adminNotifications) {
        if (!currentSet.has(notification.id)) {
          currentSet.add(notification.id);
          hasChanges = true;
        }
      }

      return hasChanges ? Array.from(currentSet) : current;
    });
  }, [adminNotifications, isAdminNotificationsOpen]);

  useEffect(() => {
    if (!isAdminNotificationsOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!adminNotificationsRef.current?.contains(event.target)) {
        setIsAdminNotificationsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsAdminNotificationsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAdminNotificationsOpen]);

  function handleGoHomeSection() {
    setActiveSection("home");
    setSelectedCategory("Todos los productos");
    setSearchInput("");
    setSearchTerm("");
  }

  function handleGoPromotionsSection(options = {}) {
    const {
      focusWelcomePromo = false,
      inviteMessage = "Para entrar a Promociones primero hacete miembro o iniciá sesión."
    } = options;

    if (!auth.user) {
      openLoginModal("register", inviteMessage);
      setPendingWelcomePromoFocus(Boolean(focusWelcomePromo));
      return;
    }

    setActiveSection("promotions");

    if (focusWelcomePromo) {
      setPendingWelcomePromoFocus(true);
    }
  }

  function handleActivateWelcomePromo() {
    // If user is not logged in, send them to login/register
    if (!auth.user) {
      handleGoPromotionsSection({
        focusWelcomePromo: true,
        inviteMessage: "Iniciá sesión o registrate para activar tu beneficio de bienvenida del 10% OFF."
      });
      return;
    }

    // If already active or used, do nothing
    if (auth.user.welcomeDiscountActive || auth.user.welcomeDiscountUsed) {
      return;
    }

    // Logged in — activate via API and return the promise so the modal can await it
    return activateWelcomeDiscount(auth.token)
      .then((data) => {
        setAuth({ token: data.token, user: data.user });
      })
      .catch((err) => {
        console.error("Error activating welcome discount:", err.message);
      });
  }

  function handleGoAboutSection() {
    setActiveSection("about");
  }

  useEffect(() => {
    if (!auth.user || !pendingWelcomePromoFocus || activeSection === "promotions") {
      return;
    }

    setActiveSection("promotions");
  }, [activeSection, auth.user, pendingWelcomePromoFocus]);

  useEffect(() => {
    if (activeSection !== "promotions" || !pendingWelcomePromoFocus) {
      return;
    }

    const timerId = window.setTimeout(() => {
      const promoCard = document.getElementById("promotions-welcome-offer");

      if (promoCard) {
        promoCard.scrollIntoView({ behavior: "smooth", block: "start" });
        promoCard.classList.add("is-highlighted");
        window.setTimeout(() => {
          promoCard.classList.remove("is-highlighted");
        }, 1800);
      }

      setPendingWelcomePromoFocus(false);
    }, 90);

    return () => window.clearTimeout(timerId);
  }, [activeSection, pendingWelcomePromoFocus]);

  function handleGoAdminSection(options = {}) {
    const { preserveOrderNavigation = false } = options;

    if (isAdmin) {
      if (!preserveOrderNavigation) {
        setAdminOrderNavigationRequest(null);
      }

      setActiveSection("admin");
    }
  }

  function handleOpenAdminFromNotification(notification) {
    setIsAdminNotificationsOpen(false);
    handleGoAdminSection({ preserveOrderNavigation: true });

    const targetOrderId = Number(notification?.orderId);
    if ((notification?.kind === "order" || notification?.kind === "invoice") && Number.isInteger(targetOrderId) && targetOrderId > 0) {
      setAdminOrderNavigationRequest({
        orderId: targetOrderId,
        intent: notification?.kind === "invoice" ? "invoice" : "order",
        requestId: Date.now()
      });
    }
  }

  function handleToggleAdminNotifications() {
    setIsAdminNotificationsOpen((current) => !current);
  }

  function handleOpenInfoPage(section) {
    if (!section) {
      return;
    }

    closeCartDrawer();
    setIsAddPopupOpen(false);
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleComplaintInputChange(event) {
    const { name, value } = event.target;
    setComplaintForm((current) => ({ ...current, [name]: value }));
  }

  function handleComplaintAttachmentChange(event) {
    const file = event.target.files?.[0] || null;
    setComplaintAttachmentFile(file);
    setComplaintAttachmentName(file ? file.name : "");
  }

  async function handleComplaintSubmit(event) {
    event.preventDefault();

    setIsComplaintSubmitting(true);
    setComplaintSubmitMessage("");

    try {
      const result = await submitLegalTicket(
        {
          requestType: "complaints-book",
          firstName: complaintForm.firstName,
          lastName: complaintForm.lastName,
          email: complaintForm.email,
          phone: complaintForm.phone,
          orderNumber: complaintForm.orderNumber,
          reason: complaintForm.reason,
          message: complaintForm.message
        },
        complaintAttachmentFile ? [complaintAttachmentFile] : []
      );

      const ticketRef = result?.item?.publicId || result?.item?.id || "";
      setComplaintSubmitMessage(
        ticketRef
          ? `Recibimos tu reclamo. Ticket #${ticketRef}. Te responderemos en un plazo máximo de 10 días hábiles.`
          : "Recibimos tu reclamo. Te responderemos en un plazo máximo de 10 días hábiles."
      );
      setComplaintForm(INITIAL_COMPLAINT_FORM);
      setComplaintAttachmentFile(null);
      setComplaintAttachmentName("");
      event.currentTarget.reset();
    } catch (error) {
      setComplaintSubmitMessage(error.message || "No se pudo registrar el reclamo");
    } finally {
      setIsComplaintSubmitting(false);
    }
  }

  function handleWithdrawalInputChange(event) {
    const { name, value } = event.target;
    setWithdrawalForm((current) => ({ ...current, [name]: value }));
  }

  function handleWithdrawalAttachmentChange(event) {
    const file = event.target.files?.[0] || null;
    setWithdrawalAttachmentFile(file);
    setWithdrawalAttachmentName(file ? file.name : "");
  }

  async function handleWithdrawalSubmit(event) {
    event.preventDefault();

    setIsWithdrawalSubmitting(true);
    setWithdrawalSubmitMessage("");

    try {
      const result = await submitLegalTicket(
        {
          requestType: "withdrawal-button",
          firstName: withdrawalForm.firstName,
          lastName: withdrawalForm.lastName,
          email: withdrawalForm.email,
          phone: withdrawalForm.phone,
          orderNumber: withdrawalForm.orderNumber,
          message: withdrawalForm.message
        },
        withdrawalAttachmentFile ? [withdrawalAttachmentFile] : []
      );

      const ticketRef = result?.item?.publicId || result?.item?.id || "";
      setWithdrawalSubmitMessage(
        ticketRef
          ? `Recibimos tu solicitud de cancelación. Ticket #${ticketRef}. Te contactaremos a la brevedad.`
          : "Recibimos tu solicitud de cancelación. Te contactaremos a la brevedad."
      );
      setWithdrawalForm(INITIAL_WITHDRAWAL_FORM);
      setWithdrawalAttachmentFile(null);
      setWithdrawalAttachmentName("");
      event.currentTarget.reset();
    } catch (error) {
      setWithdrawalSubmitMessage(error.message || "No se pudo registrar la solicitud de cancelación");
    } finally {
      setIsWithdrawalSubmitting(false);
    }
  }

  return (
    <div className={`page${isCartDrawerOpen ? " cart-lock-active" : ""}`}>
      <PromoStrip />
      <SiteHeader
        totalItems={totalItems}
        products={products}
        searchValue={searchInput}
        searchSuggestions={searchSuggestions}
        recentSearches={recentSearches}
        onRemoveRecentSearch={handleRemoveRecentSearch}
        onClearRecentSearches={handleClearRecentSearches}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        onSelectProduct={openProductPreview}
        user={auth.user}
        onAccountClick={() => openLoginModal("register")}
        onLoginClick={() => openLoginModal("login")}
        onMyAccountClick={handleOpenMyAccount}
        onOrdersClick={() => { setAccountInitialTab("pedidos"); setActiveSection("account"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        onLogout={handleLogout}
        onFavoritesClick={handleOpenFavoritesSection}
        onCartClick={openCartDrawer}
        onSelectCategory={handleSelectCategory}
        isAdmin={isAdmin}
        activeSection={activeSection}
        onGoHome={handleGoHomeSection}
        onGoPromotions={handleGoPromotionsSection}
        onGoAbout={handleGoAboutSection}
        onGoAdmin={handleGoAdminSection}
        showHeader={showHeader}
        onRepeatOrder={() => { setAccountInitialTab("pedidos"); setActiveSection("account"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        hasOrders={myOrders.length > 0}
        onSmartOrder={() => setIsSmartOrderOpen(true)}
      />

      <nav className={`nav-bar${showHeader ? "" : " nav-bar-hidden"}`}>
        <div className="container nav-inner">
          <AddressSelector
            shippingAddressLabel={shippingAddressLabel}
            user={auth.user}
            token={auth.token}
            onOpenMyAddress={handleOpenMyAddress}
            onZoneSelect={(data) => {
              if (data?.zone) {
                localStorage.setItem("delivery:selected-zone", JSON.stringify(data));
              }
            }}
            onSyncZone={(data) => {
              if (auth.token && data?.zone) {
                syncDeliveryZone(auth.token, data).catch(() => {});
              }
            }}
          />

          <ul className="primary-nav nav-shortcuts" aria-label="Accesos rápidos">
            {isAdmin ? (
              <li className="admin-notifications-item" ref={adminNotificationsRef}>
                <button
                  type="button"
                  className={`admin-nav-button nav-shortcut-btn admin-notifications-button ${isAdminNotificationsOpen ? "is-active" : ""}`}
                  onClick={handleToggleAdminNotifications}
                  aria-expanded={isAdminNotificationsOpen}
                  aria-haspopup="menu"
                  aria-label={`Notificaciones de administrador (${unseenAdminNotificationsCount} sin ver)`}
                >
                  <span className="nav-link-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 3a5 5 0 0 0-5 5v2.4c0 .8-.3 1.6-.8 2.2L4.6 15c-.6.7-.1 1.8.8 1.8h13.2c.9 0 1.4-1.1.8-1.8l-1.6-2.4a3.9 3.9 0 0 1-.8-2.2V8a5 5 0 0 0-5-5Z" />
                      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
                    </svg>
                  </span>
                  {unseenAdminNotificationsCount > 0 && (
                    <span className="admin-notifications-badge" aria-hidden="true">{adminNotificationsBadgeText}</span>
                  )}
                </button>

                {isAdminNotificationsOpen && (
                  <div className="admin-notifications-dropdown" role="menu" aria-label="Notificaciones de administrador">
                    {visibleAdminNotifications.length ? (
                      <ul className="admin-notifications-list">
                        {visibleAdminNotifications.map((notification) => (
                          <li key={notification.id} className="admin-notifications-list-item">
                            <button
                              type="button"
                              className="admin-notification-entry"
                              role="menuitem"
                              onClick={() => handleOpenAdminFromNotification(notification)}
                            >
                              <strong>{notification.title}</strong>
                              <span className="admin-notification-action">{notification.actionLabel}</span>
                              <time>{formatNotificationRelativeDate(notification.createdAt)}</time>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="admin-notifications-empty">No tenés notificaciones nuevas.</p>
                    )}
                  </div>
                )}
              </li>
            ) : null}

            {isAdmin ? (
              <li>
                <button
                  type="button"
                  className={`admin-nav-button nav-shortcut-btn ${activeSection === "admin" ? "is-active" : ""}`}
                  onClick={handleGoAdminSection}
                >
                  <span className="nav-link-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
                      <path d="M5 10.5V16l7 3.5 7-3.5v-5.5" />
                    </svg>
                  </span>
                  Admin
                </button>
              </li>
            ) : null}
            <li>
              <button
                type="button"
                className={`admin-nav-button nav-shortcut-btn ${isInicioActive ? "is-active" : ""}`}
                onClick={handleGoHomeSection}
              >
                <span className="nav-link-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 11.5 12 5l8 6.5" />
                    <path d="M6.5 10.5V19h11v-8.5" />
                    <path d="M10 19v-4h4v4" />
                  </svg>
                </span>
                Inicio
              </button>
            </li>
            {auth.user && myOrders.length > 0 && (
              <li>
                <button
                  type="button"
                  className="admin-nav-button nav-shortcut-btn nav-repeat-order-btn"
                  onClick={() => { setAccountInitialTab("pedidos"); setActiveSection("account"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  title="Repetir pedido"
                >
                  <span className="nav-link-icon" aria-hidden="true">
                    <img src="/fotos/iconos%20general/uim--repeat.svg" alt="" width="20" height="20" />
                  </span>
                  Repetir pedido
                </button>
              </li>
            )}
            <li>
              <button
                type="button"
                className={`admin-nav-button nav-shortcut-btn ${isPromotionsActive ? "is-active" : ""}`}
                onClick={handleGoPromotionsSection}
              >
                <span className="nav-link-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="8" cy="8" r="2" />
                    <circle cx="16" cy="16" r="2" />
                    <path d="M7 17 17 7" />
                  </svg>
                </span>
                Promociones
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`admin-nav-button nav-shortcut-btn ${isAboutActive ? "is-active" : ""}`}
                onClick={handleGoAboutSection}
              >
                <span className="nav-link-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="3" />
                    <path d="M5 19c1.2-3 3.8-4.6 7-4.6s5.8 1.6 7 4.6" />
                  </svg>
                </span>
                Sobre Nosotros
              </button>
            </li>
            <li>
              <button
                type="button"
                className="admin-nav-button nav-shortcut-btn nav-smart-order-btn"
                onClick={() => setIsSmartOrderOpen(true)}
              >
                <span className="nav-link-icon" aria-hidden="true">
                  <img src="/fotos/iconos%20general/lineicons--open-ai.svg" alt="" width="20" height="20" />
                </span>
                Pedido Inteligente
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {isAddPopupOpen && lastAddedProduct && (
        <aside
          className="add-popup"
          role="dialog"
          aria-label="Producto agregado al carrito"
        >
          <header className="add-popup-header">
            <div className="add-popup-status">
              <span className="add-popup-check" aria-hidden="true">✓</span>
              <span>Agregado</span>
            </div>
            <button type="button" className="add-popup-close" aria-label="Cerrar" onClick={closeAddPopup}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>

          <div className="add-popup-body">
            <div className="add-popup-product">
              <img
                className="add-popup-image"
                src={getProductImageUrl(lastAddedProduct)}
                alt={lastAddedProduct.imageAlt || lastAddedProduct.name}
              />
              <div>
                <h3>{lastAddedProduct.displayName || lastAddedProduct.name}</h3>
                <p>${Number(lastAddedProduct.displayPrice ?? lastAddedProduct.price).toLocaleString("es-AR")} ARS</p>
              </div>
            </div>

            <div className="add-popup-subtotal-row">
              <span>{totalItems} artículo{totalItems === 1 ? "" : "s"}</span>
              <strong>${cartSubtotal.toLocaleString("es-AR")}</strong>
            </div>

            <button type="button" className="add-popup-view-cart-btn" onClick={openCartDrawer}>
              Ver carrito
            </button>
          </div>
        </aside>
      )}

      {isCartDrawerOpen && (
        <div className={`cart-drawer-backdrop${isCartDrawerClosing ? " is-closing" : ""}`} onClick={closeCartDrawer}>
          <aside
            className={`cart-drawer${isCartDrawerClosing ? " is-closing" : ""}`}
            aria-label="Carrito"
            role="dialog"
            aria-modal="true"
            onAnimationEnd={isCartDrawerClosing ? handleCartDrawerCloseAnimationEnd : undefined}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="cart-drawer-header">
              <h2>Carrito ({totalItems} ítem{totalItems === 1 ? "" : "s"})</h2>
              <button type="button" className="cart-drawer-close" onClick={closeCartDrawer} aria-label="Cerrar carrito">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </header>

            <section className={`cart-free-shipping ${hasReachedFreeShipping ? "is-complete" : ""}`} aria-live="polite">
              <p className="cart-free-shipping-message">
                {hasReachedFreeShipping
                  ? "Ya desbloqueaste el envio gratis en este pedido."
                  : `Te faltan $${freeShippingRemaining.toLocaleString("es-AR")} ARS para tener envio gratis.`}
              </p>
              <div
                className="cart-free-shipping-track"
                role="progressbar"
                aria-label="Progreso para envio gratis"
                aria-valuemin={0}
                aria-valuemax={FREE_SHIPPING_TARGET_ARS}
                aria-valuenow={Math.round(Math.min(cartSubtotal, FREE_SHIPPING_TARGET_ARS))}
              >
                <span
                  className="cart-free-shipping-fill"
                  style={{ width: `${freeShippingProgressPercent.toFixed(2)}%` }}
                />
              </div>
              <p className="cart-free-shipping-caption">Envio gratis a partir de $50.000 ARS</p>
            </section>

            <div className="cart-drawer-content-grid">
              <div className="cart-drawer-body">
                {!cart.length ? (
                  <div className="cart-empty-state">
                    <div className="cart-empty-message">
                      <span className="cart-empty-icon" aria-hidden="true">
                        <svg viewBox="0 0 50 50" width="48" height="48">
                          <path fill="#1877f2" opacity=".18" d="M35 34H13c-.3 0-.6-.2-.8-.4s-.2-.6-.1-.9l1.9-4.8L12.1 10H6V8h7c.5 0 .9.4 1 .9l2 19c0 .2 0 .3-.1.5L14.5 32H36z"/>
                          <path fill="#1877f2" opacity=".18" d="m15.2 29l-.4-2L38 22.2V14H14v-2h25c.6 0 1 .4 1 1v10c0 .5-.3.9-.8 1zM36 40c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-24 6c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
                        </svg>
                      </span>
                      <p>Tu carrito está vacío</p>
                      <span className="cart-empty-sub">¡Agregá productos para empezar!</span>
                    </div>

                    <div className="cart-empty-actions">
                      <button type="button" className="cart-empty-action-btn cart-empty-smart-btn" onClick={() => { closeCartDrawer(); setTimeout(() => setIsSmartOrderOpen(true), 300); }}>
                        <img src="/fotos/iconos%20general/lineicons--open-ai.svg" alt="" width="18" height="18" />
                        Pedido Inteligente
                      </button>
                      {auth.user && myOrders.length > 0 && (
                        <button type="button" className="cart-empty-action-btn cart-empty-repeat-btn" onClick={() => { closeCartDrawer(); setTimeout(() => { setAccountInitialTab("pedidos"); setActiveSection("account"); window.scrollTo({ top: 0, behavior: "smooth" }); }, 300); }}>
                          <img src="/fotos/iconos%20general/uim--repeat.svg" alt="" width="18" height="18" />
                          Repetir pedido
                        </button>
                      )}
                    </div>

                    {emptyCartRecommendations.length > 0 && (
                      <div className="cart-empty-recs">
                        <h3 className="cart-empty-recs-title">Te puede interesar</h3>
                        <ul className="cart-empty-recs-list">
                          {emptyCartRecommendations.map((product) => (
                            <li key={product.id} className="cart-empty-rec-card">
                              <div className="cart-empty-rec-img-wrap">
                                <img src={getProductImageUrl(product)} alt={product.name} loading="lazy" />
                              </div>
                              <div className="cart-empty-rec-info">
                                <span className="cart-empty-rec-name">{product.name}</span>
                                <span className="cart-empty-rec-price">${Number(product.price_ars || product.price).toLocaleString("es-AR")} ARS</span>
                              </div>
                              <button type="button" className="cart-empty-rec-add" onClick={() => addToCart(product, 1)} aria-label={`Agregar ${product.name}`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <ul className="cart-drawer-list">
                      {cart.map((item) => (
                        <li key={item.cartKey || `${item.id}:base`} className="cart-drawer-line">
                          <button
                            type="button"
                            className="cart-item-image-btn"
                            onClick={() => openCartItemProduct(item)}
                            aria-label={`Ver detalle de ${item.name}`}
                          >
                            <img className="cart-drawer-image" src={getProductImageUrl(item)} alt={getProductImageAlt(item, 0)} />
                          </button>

                          <div className="cart-drawer-info">
                            <h3>
                              <button
                                type="button"
                                className="cart-item-title-btn"
                                onClick={() => openCartItemProduct(item)}
                                aria-label={`Ver detalle de ${item.name}`}
                              >
                                {item.name}
                              </button>
                            </h3>
                            {(item.variantPresentation || item.variantName) && (
                              <p className="cart-drawer-unit-price">
                                {item.variantPresentation ? `${item.variantPresentation}: ` : ""}
                                {item.variantName}
                              </p>
                            )}
                            <p className="cart-drawer-unit-price">${Number(item.price).toLocaleString("es-AR")} ARS</p>

                            <div className="cart-drawer-line-footer">
                              <div className="cart-qty-control" aria-label={`Cantidad de ${item.name}`}>
                                <button
                                  type="button"
                                  onClick={() => updateCartQuantity(item.cartKey || `${item.id}:base`, item.quantity - 1)}
                                  aria-label={`Quitar una unidad de ${item.name}`}
                                >
                                  -
                                </button>
                                <span>{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateCartQuantity(item.cartKey || `${item.id}:base`, item.quantity + 1)}
                                  title={isCartItemAtStockLimit(item) ? "No hay mas stock disponible" : undefined}
                                  aria-label={`Agregar una unidad de ${item.name}`}
                                >
                                  +
                                </button>
                              </div>

                              <strong className="cart-drawer-line-total">
                                ${(Number(item.price) * item.quantity).toLocaleString("es-AR")} ARS
                              </strong>
                            </div>

                            {cartStockMessage
                              && cartStockMessageCartKey === (item.cartKey || `${item.id}:base`) && (
                              <p className="cart-item-stock-warning" role="status" aria-live="polite">
                                {cartStockMessage}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            className="cart-drawer-remove"
                            onClick={() => removeFromCart(item.cartKey || `${item.id}:base`)}
                            aria-label={`Eliminar ${item.name}`}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M8 7V5h8v2M5 7h14M9 10v7M15 10v7M7 7l1 12h8l1-12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>

                    <div className="cart-drawer-list-actions">
                      <button
                        type="button"
                        className="cart-drawer-clear-btn"
                        onClick={() => setIsClearCartConfirmOpen(true)}
                      >
                        <span className="cart-clear-btn-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <path d="M8 7V5h8v2M5 7h14M9 10v7M15 10v7M7 7l1 12h8l1-12" />
                          </svg>
                        </span>
                        Vaciar carrito
                      </button>
                    </div>
                  </>
                )}
              </div>

              <footer className="cart-drawer-footer">
              {!auth.user?.welcomeDiscountActive && !auth.user?.welcomeDiscountUsed && (
                <button
                  type="button"
                  className="cart-drawer-welcome-promo-btn"
                  onClick={() => {
                    handleActivateWelcomePromo();
                  }}
                >
                  <img src="/fotos/iconos%20general/fluent--gift-card-16-filled.svg" alt="" width="18" height="18" />
                  <span>{auth.user ? "Activar 10% OFF en esta compra" : "Registrate y activá 10% OFF"}</span>
                </button>
              )}
              <button
                type="button"
                className="cart-promo-btn"
                onClick={() => {
                  setIsCartPromoOpen((current) => {
                    const nextValue = !current;
                    if (nextValue) {
                      setShouldFocusCartPromoInput(true);
                    }
                    return nextValue;
                  });
                }}
              >
                <span className="cart-promo-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12.5 12.5 4H20v7.5L11.5 20 4 12.5Z" />
                    <circle cx="15.2" cy="8.8" r="1.2" />
                  </svg>
                </span>
                <span>Ingresar código de promoción</span>
              </button>

              {isCartPromoOpen && (
                <div className="cart-drawer-promo-panel" aria-label="Código promocional en carrito rápido">
                  <input
                    ref={cartDrawerPromoInputRef}
                    type="text"
                    placeholder="P. ej., OFERTA50"
                    value={cartPromoCode}
                    onChange={(event) => setCartPromoCode(event.target.value)}
                  />
                  <button
                    type="button"
                    className="cart-extra-apply-btn"
                    onClick={handleApplyCartPromotion}
                    disabled={isApplyingCartPromo}
                  >
                    {isApplyingCartPromo ? "Aplicando..." : "Aplicar"}
                  </button>
                </div>
              )}
              {isCartPromoOpen && cartPromoMessage && <p className="cart-drawer-promo-message">{cartPromoMessage}</p>}
              {isCartPromoOpen && appliedCartPromoPercent !== null && (
                <p className="cart-drawer-promo-percent">Descuento aplicado: {appliedCartPromoPercent}%</p>
              )}

              <div className="cart-drawer-checkout-bottom">
                <div className="cart-drawer-total-wrap">
                  <div className="cart-drawer-total-row">
                    <span>Subtotal</span>
                    <strong>${cartSubtotal.toLocaleString("es-AR")} ARS</strong>
                  </div>

                  {cartDiscount > 0 && (
                    <div className="cart-drawer-total-row">
                      <span>Descuento cupón</span>
                      <strong>-${cartDiscount.toLocaleString("es-AR")} ARS</strong>
                    </div>
                  )}

                  {welcomeDiscountAmount > 0 && (
                    <>
                      <div className="cart-drawer-discount-row-a">
                        <svg viewBox="0 0 64 64" style={{width:'13px',height:'13px',display:'block',flexShrink:0}}>
                          <path fill="#1877f2" d="M51.429 15.856c4.558-4.299-.715-9.875-10.687-6.421c-.587.204-1.133.419-1.648.642c.977-1.876 2.42-3.924 4.58-5.885c0 0-4.034 1.449-5.898 1.082C35.464 4.819 34.739 2 34.739 2s-2.405 5.238-3.63 9.349c-1.754-3.532-3.697-6.969-3.697-6.969s-1.037 2.404-2.936 3.318c-1.531.74-7.829 1.378-7.829 1.378c2.1 1.074 3.903 2.401 5.433 3.774c-1.609-.426-3.446-.746-5.547-.898c-8.344-.605-11.621 2.372-10.505 5.313L2 17.394l2.192 8.219L5.554 26c3.232 10.949 2.45 23.098 2.44 23.235l-.055.792l.754.222C20.766 53.805 31.735 62 31.735 62s14.222-9.412 22.042-11.753l.684-.205l.014-.72c.004-.17.346-15.334 4.271-25.218c.276-.039.536-.07.759-.084l.827-.05l.083-.832c.003-.033.341-4.796 1.586-6.739zM4.587 19.7l6.483 1.759v4.063l-5.381-1.528zm10.074 30.512a70 70 0 0 0-4.681-1.63c.128-2.822.313-12.549-2.233-21.96l4.71 1.338c.912 4.023 2.426 12.311 2.204 22.252m7.893-35.169c8.094.586 9.517 4.764 9.517 4.764s-4.931 1.803-7.978 1.803c-9.942 0-11.378-7.28-1.539-6.567m9.988 5.379l8.126.921l-10.13 2.451l-5.786-1.293zm-9.729 3.661l6.76 1.51v5.184l-6.979-1.947zm8.041 34.937c-1.476-1.096-3.936-2.787-7.202-4.6c.259-4.777.29-17.541.291-23.198l6.911 1.963zm9.046-4.356a138 138 0 0 0-7.1 4.496V32.29a511 511 0 0 1 8.162-2.917c-.587 5.658-.954 20.424-1.062 25.291m3.28-27.832s-9.738 3.125-11.659 3.834V25.58l11.811-2.858zm-1.2-7.461c-4.559 1.168-9.408.344-9.408.344s-.909-4.465 6.451-7.014c8.946-3.099 12.483 4.229 2.957 6.67m6.711-1.699l5.796.326l-3.481.843l-4.157-.41c.673-.234 1.284-.49 1.842-.759m3.856 30.9c-1.447.473-2.973 1.092-4.511 1.793c.011-4.684.297-15.066 2.467-24.145c2.231-.688 4.299-1.275 5.987-1.672c-3.227 8.986-3.838 20.96-3.943 24.024m6.038-26.431s-3.201.938-5.245 1.502l.514-3.468l5.565-1.346c-.456 1.255-.834 3.312-.834 3.312"/>
                        </svg>
                        <span className="cart-drawer-discount-row-a-label">10% OFF</span>
                        <span className="cart-drawer-discount-row-a-amount">-${welcomeDiscountAmount.toLocaleString("es-AR")} ARS</span>
                      </div>
                      {auth.user?.welcomeDiscountExpiresAt && (
                        <div className="cart-drawer-discount-row-b">
                          <svg viewBox="0 0 24 24" style={{width:'12px',height:'12px',display:'block',flexShrink:0}}>
                            <path fill="#92400e" fillRule="evenodd" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m0-1.2a8.8 8.8 0 1 0 0-17.6a8.8 8.8 0 0 0 0 17.6"/>
                            <path className="clock-animated" fill="#92400e" fillRule="evenodd" d="m12.6 11.503l3.891 3.891l-.848.849L11.4 12V6h1.2z" style={{transformOrigin:'12px 12px'}}/>
                          </svg>
                          <WelcomeDiscountTimer expiresAt={auth.user.welcomeDiscountExpiresAt} mode="compact" />
                        </div>
                      )}
                    </>
                  )}

                  <div className="cart-drawer-total-row cart-drawer-final-total">
                    <span>Total</span>
                    <strong>${(cartSubtotalAfterDiscount - welcomeDiscountAmount).toLocaleString("es-AR")} ARS</strong>
                  </div>
                </div>

                <button type="button" className="cart-pay-btn" onClick={handleGoToCartPage}>
                  <span className="cart-pay-btn-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M3 6h2l2 10h10l2-7H7M10 20a1 1 0 1 1-2 0a1 1 0 0 1 2 0m8 0a1 1 0 1 1-2 0a1 1 0 0 1 2 0" />
                    </svg>
                  </span>
                  Ver carrito y pagar
                </button>

                <p className="cart-secure-note">
                  <span aria-hidden="true" style={{display: 'inline-flex', alignItems: 'center', marginRight: '0.35em'}}>
                    <svg viewBox="0 0 50 50" style={{width: '1.2em', height: '1.2em', display: 'block'}}>
                      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path stroke="#344054" d="M25 35.417v-2.084m3.125-3.125a3.125 3.125 0 1 1-6.25 0a3.125 3.125 0 0 1 6.25 0"/>
                        <path stroke="#1877f2" d="M39.583 41.667V20.833c0-1.15-.932-2.083-2.083-2.083h-25c-1.15 0-2.083.933-2.083 2.083v20.834c0 1.15.932 2.083 2.083 2.083h25c1.15 0 2.083-.933 2.083-2.083m-6.25-22.917v-4.167a8.333 8.333 0 1 0-16.666 0v4.167"/>
                      </g>
                    </svg>
                  </span>
                  <span>Pago seguro</span>
                </p>
              </div>
              </footer>
            </div>

            {isClearCartConfirmOpen && (
              <div className="cart-drawer-confirm-backdrop" onClick={() => setIsClearCartConfirmOpen(false)}>
                <div className="cart-drawer-confirm-modal" role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                  <h3>¿Estás seguro que querés vaciar el carrito?</h3>
                  <p>Se eliminarán todos los productos cargados.</p>
                  <div className="cart-drawer-confirm-actions">
                    <button type="button" className="secondary-btn" onClick={() => setIsClearCartConfirmOpen(false)}>
                      Cancelar
                    </button>
                    <button type="button" className="danger-btn" onClick={handleConfirmClearCart}>
                      Sí, vaciar carrito
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      <Suspense fallback={null}>
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setLoginInviteMessage("");
          setVerificationEmail("");
          setPendingWelcomePromoFocus(false);
        }}
        onSubmit={handleLogin}
        onVerifyEmail={handleVerifyEmail}
        onResendCode={handleResendVerificationCode}
        onForgotPassword={handleForgotPassword}
        onResetPassword={handleResetPassword}
        isLoading={isAuthLoading}
        error={authError}
        initialView={loginModalView}
        inviteMessage={loginInviteMessage}
        verificationEmail={verificationEmail}
      />
      </Suspense>

      <Suspense fallback={null}>
      <WelcomeDiscountModal
        isOpen={isWelcomeDiscountModalOpen}
        onClose={() => setIsWelcomeDiscountModalOpen(false)}
        expiresAt={auth.user?.welcomeDiscountExpiresAt}
        isDiscountActive={auth.user?.welcomeDiscountActive || false}
        onActivate={handleActivateWelcomePromo}
      />
      </Suspense>

      <div className="container">

        <main className={isInicioActive ? "main-home" : ""}>
         <Suspense fallback={<LazyFallback />}>
          {activeSection === "admin" && isAdmin ? (
            <AdminPanel
              products={products}
              orders={orders}
              categories={categories}
              variantsByProduct={variantsByProduct}
              shippingRules={shippingRules}
              promotions={promotions}
              customers={customers}
              members={members}
              administrators={administrators}
              reorderItemsByCustomer={reorderItemsByCustomer}
              customerActivityByCustomer={customerActivityByCustomer}
              salesByProduct={salesByProduct}
              salesByBrand={salesByBrand}
              tickets={tickets}
              ticketMetrics={ticketMetrics}
              isTicketsLoading={isTicketsLoading}
              analytics={analyticsData}
              isAnalyticsLoading={isAnalyticsLoading}
              lowStockAlerts={lowStockAlerts}
              orderNavigationRequest={adminOrderNavigationRequest}
              onCreate={handleCreateProduct}
              onUpdate={handleUpdateProduct}
              onUploadMedia={handleUploadProductMedia}
              onDelete={handleDeleteProduct}
              onOrderStatusChange={handleOrderStatusChange}
              onEnsureOrderInvoice={handleEnsureOrderInvoice}
              onLoadVariants={handleLoadVariants}
              onCreateVariant={handleCreateVariant}
              onDeleteVariant={handleDeleteVariant}
              onCreateCategory={handleCreateCategory}
              onDeleteCategory={handleDeleteCategory}
              onUpdateCategory={handleUpdateCategory}
              onUpdateShippingRule={handleUpdateShippingRule}
              onQuoteShipping={handleQuoteShipping}
              onCreatePromotion={handleCreatePromotion}
              onApplyPromotion={handleApplyPromotion}
              onLoadCustomerReorder={handleLoadCustomerReorder}
              onLoadCustomerActivity={handleLoadCustomerActivity}
              onDeleteMember={handleDeleteMember}
              onDeleteMembersBulk={handleDeleteMembersBulk}
              onCreateTicket={handleCreateTicket}
              onUpdateTicket={handleUpdateTicket}
              onAddTicketComment={handleAddTicketComment}
              onCloseTicket={handleCloseTicket}
              onDeleteTicket={handleDeleteTicket}
              onReloadTickets={handleReloadTickets}
              onReloadAnalytics={handleReloadAdminAnalytics}
              notifications={serverNotifications}
              unreadNotificationsCount={unreadNotificationsCount}
              onMarkNotificationRead={handleMarkNotificationRead}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              message={adminMessage}
            />
          ) : activeSection === "promotions" ? (
            <section className="placeholder-view" aria-label="Promociones">
              <h1 className="promotions-title">
                Promociones & Novedades – <span className="promotions-title-soft">Solo Miembros</span>
              </h1>
              <p className="subtitle promotions-intro-subtitle">
                Accedé a descuentos exclusivos, envíos especiales y adelantos de lo que se viene.
              </p>
              <section className="promotions-member-welcome" aria-label="Bienvenida para miembros">
                <p className="promotions-member-lead">
                  <strong className="promotions-member-name">{promotionsMemberName}</strong>, estas son tus Promociones & Novedades.
                </p>
                <p>Esta página es exclusiva para vos y solo podés acceder porque sos miembro de La Boutique de la Limpieza.</p>
                <p>Disfrutá de beneficios únicos, descuentos especiales y enterate antes que nadie de lo que se viene.</p>
              </section>
              <article id="promotions-welcome-offer" className="welcome-promo-card" aria-label="Promoción bienvenida">
                <div className="welcome-promo-main">
                  <h2>Promoción Bienvenida – 10% OFF</h2>
                  <p>Al registrarte en nuestra web, recibís un <strong>10% de descuento</strong> en tu primera compra.</p>
                  <ul>
                    <li>Para obtenerlo, debés <strong>ingresar el código {WELCOME_PROMO_CODE}</strong> en el checkout.</li>
                    <li>Válido para <strong>todos los productos</strong> de la tienda.</li>
                    <li>Promoción exclusiva para <strong>usuarios registrados</strong>.</li>
                    <li><strong>Código de un solo uso</strong> por usuario.</li>
                  </ul>
                  <button type="button" className="welcome-promo-copy" onClick={handleCopyWelcomePromoCode}>
                    <span className="welcome-promo-copy-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <rect x="9" y="3" width="11" height="14" rx="2" ry="2" />
                        <rect x="4" y="8" width="11" height="13" rx="2" ry="2" />
                      </svg>
                    </span>
                    <span>Copiar código {WELCOME_PROMO_CODE}</span>
                  </button>
                  {welcomePromoMessage && <p className="welcome-promo-message">{welcomePromoMessage}</p>}
                </div>

                <div className="welcome-promo-side" aria-hidden="true">
                  <span className="welcome-promo-side-title">OBTENER</span>
                  <strong>10%</strong>
                  <span className="welcome-promo-side-subtitle">OFF</span>
                </div>
              </article>

              <article className="welcome-promo-card shipping-promo-card" aria-label="Promoción envío gratis">
                <div className="welcome-promo-main">
                  <h2>Promoción Envío Gratis en CABA y Gran Buenos Aires</h2>
                  <p>
                    Cuando tu compra supera los <strong>$50.000</strong>, el costo de envío dentro de
                    <strong> Ciudad Autónoma de Buenos Aires (CABA) y Gran Buenos Aires</strong> es totalmente gratis.
                  </p>
                  <ul>
                    <li><strong>No necesitas cupón.</strong></li>
                    <li>Se aplica <strong>automáticamente</strong> en el checkout.</li>
                    <li>Válido <strong>solo</strong> para entregas en <strong>CABA y Gran Buenos Aires</strong>.</li>
                    <li><strong>Promoción permanente</strong>, sin fecha de finalización.</li>
                  </ul>
                </div>

                <div className="shipping-promo-side" aria-hidden="true">
                  <img src="/fotos/bannerEnvio.webp" alt="Promoción de envíos gratis en CABA y Gran Buenos Aires" />
                </div>
              </article>
            </section>
          ) : activeSection === "about" ? (
            <section className="about-view" aria-label="Sobre Nosotros">
              <section className="about-hero" aria-label="Nuestra historia">
                <div className="about-hero-media">
                  <img
                    src="/fotos/NahuelyGri.webp"
                    alt="Frente del local de La Boutique de la Limpieza"
                  />
                </div>

                <div className="about-hero-content">
                  <h1>Conócenos un poco más</h1>
                  <p>
                    <strong>La Boutique de la Limpieza</strong> es una empresa familiar con más de 15 años de experiencia en
                    el rubro, ofreciendo soluciones de limpieza para hogares, comercios, consorcios, clubes, empresas y
                    restaurantes.
                  </p>
                  <p>
                    Desde nuestro local en Villa Crespo, y ahora también online, trabajamos para ser un aliado confiable en
                    cada compra.
                  </p>
                  <p>
                    Ponemos al cliente en el centro: no solo vendemos productos, también ayudamos a resolver necesidades
                    reales con atención cercana.
                  </p>
                </div>
              </section>

              <div className="about-divider" aria-hidden="true" />

              <section className="about-values" aria-label="Qué nos define">
                <h2>¿Qué nos define?</h2>
                <ul>
                  <li>
                    <strong>Atención directa de los dueños:</strong> Sin intermediarios, con respuestas claras y soluciones
                    prácticas.
                  </li>
                  <li>
                    <strong>Asesoramiento técnico:</strong> Recomendamos productos según tus necesidades reales, sin vueltas.
                  </li>
                  <li>
                    <strong>Relación a largo plazo:</strong> La mayoría de nuestros clientes vuelven, y eso es lo que más
                    valoramos.
                  </li>
                </ul>
              </section>

              <div className="about-divider" aria-hidden="true" />

              <section className="about-contact" aria-label="Dónde encontrarnos">
                <div className="about-contact-info">
                  <h3>Como siempre, pueden encontrarnos en:</h3>
                  <ul>
                    <li>
                      <span className="about-contact-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="11" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      </span>
                      <span>Acevedo 200, esquina Padilla, Villa Crespo (CABA)</span>
                    </li>
                    <li>
                      <span className="about-contact-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M12 7.5v5l3.3 1.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span>Lunes a Viernes de 09:00 a 13:00 y de 15:30 a 19:00</span>
                    </li>
                    <li>
                      <span className="about-contact-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.08 5.18 2 2 0 0 1 5.07 3h3a2 2 0 0 1 2 1.72c.12.9.35 1.78.68 2.62a2 2 0 0 1-.45 2.11L9.09 10.91a16 16 0 0 0 4 4l1.46-1.21a2 2 0 0 1 2.11-.45c.84.33 1.72.56 2.62.68A2 2 0 0 1 22 16.92Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span>011 15 5501-8399</span>
                    </li>
                  </ul>
                </div>

                <div className="about-map-wrap">
                  <iframe
                    title="Mapa del local en Villa Crespo"
                    src="https://www.google.com/maps?q=Acevedo%20200%2C%20CABA&output=embed"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </section>
            </section>
          ) : activeSection === "consumer-defense" ? (
            <section className="legal-info-view consumer-defense-view" aria-label="Defensa al consumidor">
              <img
                className="legal-info-logo"
                src="/fotos/logo/La boutique de la limpiezalogo.webp"
                alt="La Boutique de la Limpieza"
              />
              <h1>Defensa al Consumidor</h1>
              <div className="legal-info-divider" aria-hidden="true" />
              <p className="legal-info-text">
                Si tenés algún inconveniente con tu compra y no logramos solucionarlo, podés iniciar un reclamo en el sitio oficial del Gobierno de la Ciudad:{" "}
                <a
                  href="https://buenosaires.gob.ar/gobierno/atencion-ciudadana/defensa-al-consumidor"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://buenosaires.gob.ar/gobierno/atencion-ciudadana/defensa-al-consumidor
                </a>
              </p>
            </section>
          ) : activeSection === "terms-conditions" ? (
            <section className="legal-info-view legal-terms-view" aria-label="Términos y condiciones">
              <img
                className="legal-info-logo"
                src="/fotos/logo/La boutique de la limpiezalogo.webp"
                alt="La Boutique de la Limpieza"
              />
              <h1>Términos y Condiciones</h1>
              <div className="legal-info-divider" aria-hidden="true" />

              <p className="legal-terms-intro">
                Bienvenido/a a La Boutique de la Limpieza®. El uso de este sitio web implica la aceptación plena y sin reservas de los presentes Términos y Condiciones. Si no está de acuerdo con alguno de ellos, se recomienda no utilizar este sitio web.
              </p>

              <div className="legal-terms-content">
                <h2>1. Información general</h2>
                <p>
                  Este sitio web es operado por La Boutique de la Limpieza®, con domicilio en Acevedo 200, C1414, Ciudad Autónoma de Buenos Aires, Argentina.
                </p>
                <p><strong>Razón social:</strong> Nahuel Rosemberg</p>
                <p><strong>CUIT:</strong> 20409938311</p>
                <p><strong>Correo de contacto:</strong> Laboutiqueacevedo200@gmail.com</p>
                <p><strong>WhatsApp / Teléfono:</strong> +54 9 11-5501-8399</p>

                <h2>2. Precios y disponibilidad</h2>
                <p>Los precios publicados en el sitio web pueden sufrir modificaciones sin previo aviso.</p>
                <p>Todos los productos están sujetos a disponibilidad de stock al momento de confirmar el pedido.</p>
                <p>
                  En caso de que un producto no se encuentre disponible luego de la compra, se notificará al cliente y se ofrecerá una alternativa o el reembolso completo del pago realizado.
                </p>

                <h2>3. Imágenes y descripciones</h2>
                <p>Las imágenes utilizadas en el sitio web son ilustrativas y de carácter referencial.</p>
                <p>
                  Se procura que las descripciones de los productos sean precisas y actualizadas, pero no garantizamos que el contenido esté libre de errores o inexactitudes.
                </p>

                <h2>4. Confirmación de pedidos</h2>
                <p>
                  La confirmación de un pedido implica la aceptación de los presentes Términos y Condiciones, así como de las políticas de envío, cambios y devoluciones.
                </p>
                <p>
                  La Boutique de la Limpieza® se reserva el derecho de cancelar pedidos en caso de errores involuntarios en precios, disponibilidad o problemas de pago, notificando al cliente y gestionando el reembolso correspondiente.
                </p>

                <h2>5. Pagos</h2>
                <p>
                  Los pagos se realizan a través de plataformas seguras y externas, como Mercado Pago o transferencia bancaria.
                </p>
                <p>
                  La Boutique de la Limpieza® no almacena ni retiene datos bancarios ni de tarjetas de crédito de los clientes. Todos los datos sensibles son procesados por los proveedores de pago según sus propios estándares de seguridad.
                </p>

                <h2>6. Envíos</h2>
                <p>
                  Realizamos envíos únicamente dentro de la Ciudad Autónoma de Buenos Aires (CABA) y en el Gran Buenos Aires. Utilizamos servicios de terceros (empresa de mensajería) para la logística y distribución, lo que puede influir en los tiempos de entrega.
                </p>
                <p>El plazo de entrega estimado es de 3 a 4 días hábiles. Este plazo puede extenderse en fechas de alta demanda.</p>
                <p>Las entregas se realizan únicamente de lunes a viernes.</p>
                <p>El costo de envío es de $5.000 ARS para todo CABA.</p>
                <p>El costo de envío es de $7.000 ARS para todo el Gran Buenos Aires.</p>
                <p>Ofrecemos envío gratuito en compras superiores a $50.000 ARS.</p>
                <p>También podés optar por retiro en el local coordinando previamente.</p>
              <p>Para más detalles, consultá la sección Políticas De Envíos.</p>

                <h2>7. Cambios, devoluciones y botón de arrepentimiento</h2>
                <p>
                  Los cambios y devoluciones están regulados por las condiciones establecidas en el apartado "Cambios y Devoluciones" del sitio web.
                </p>
                <p>
                  El cliente cuenta con 10 días corridos para ejercer el derecho de arrepentimiento, conforme lo establece la Ley 24.240 de Defensa del Consumidor.
                </p>
                <p>
                  Para iniciar el proceso, el cliente puede contactarnos a través de nuestros canales de atención o hacer clic en el Botón de Arrepentimiento ubicado al final de la página.
                </p>

                <h2>8. Protección de datos personales</h2>
                <p>
                  Toda la información personal que el usuario brinde será tratada con absoluta confidencialidad y conforme a lo establecido por la Ley 25.326 de Protección de los Datos Personales. El titular de los datos podrá en cualquier momento solicitar el acceso, rectificación o supresión de los mismos.
                </p>
                <p>
                  La Boutique de la Limpieza® se compromete a no compartir, vender ni ceder datos personales a terceros sin consentimiento previo, salvo obligación legal.
                </p>

                <h2>9. Responsabilidad del usuario</h2>
                <p>
                  El usuario se compromete a utilizar el sitio web de forma lícita y respetuosa, evitando cualquier actividad que pueda perjudicar su funcionamiento o afectar a terceros.
                </p>
                <p>
                  Es responsabilidad del usuario que la información proporcionada (datos de contacto, dirección de entrega, etc.) sea completa y verídica.
                </p>

                <h2>10. Modificaciones de los términos</h2>
                <p>
                  La Boutique de la Limpieza® se reserva el derecho de actualizar o modificar estos Términos y Condiciones en cualquier momento, sin necesidad de notificación previa. Las modificaciones entrarán en vigor a partir de su publicación en el sitio web.
                </p>

                <h2>11. Jurisdicción y ley aplicable</h2>
                <p>Estos Términos y Condiciones se rigen por las leyes de la República Argentina.</p>
                <p>
                  Cualquier controversia que surja con relación al uso del sitio web será sometida a la jurisdicción de los tribunales competentes de la Ciudad Autónoma de Buenos Aires.
                </p>
              </div>
            </section>
          ) : activeSection === "returns-exchanges" ? (
            <section className="legal-info-view legal-terms-view" aria-label="Políticas de cambios y devoluciones">
              <img
                className="legal-info-logo"
                src="/fotos/logo/La boutique de la limpiezalogo.webp"
                alt="La Boutique de la Limpieza"
              />
              <h1>Políticas De Cambios y Devoluciones</h1>
              <div className="legal-info-divider" aria-hidden="true" />

              <p className="legal-terms-intro">
                En La Boutique de la Limpieza® queremos que estés 100% satisfecho con tu compra. Si necesitás realizar un cambio o devolución, tené en cuenta lo siguiente:
              </p>

              <div className="legal-terms-content">
                <p>Podés solicitarlo dentro de los 10 días corridos posteriores a la recepción del producto.</p>
                <p>El producto debe estar en perfecto estado, sin uso y con su empaque original.</p>
                <p>
                  Los costos de envío por cambios o devoluciones corren a cargo del cliente, excepto en caso de error nuestro o producto defectuoso.
                </p>
                <p>
                  No se aceptan devoluciones de productos abiertos o de uso personal, salvo que presenten fallas.
                </p>
                <p>Para iniciar una solicitud de cambio o devolución podés:</p>
                <p>Escribirnos por WhatsApp o correo electrónico</p>
                <p>
                  O bien, ir al final de esta página y hacer clic en el botón de “Botón de arrepentimiento” para completar el formulario y solicitar tu reembolso desde ahí.
                </p>
              </div>
            </section>
          ) : activeSection === "shipping-policies" ? (
            <section className="legal-info-view legal-terms-view" aria-label="Políticas de envíos">
              <img
                className="legal-info-logo"
                src="/fotos/logo/La boutique de la limpiezalogo.webp"
                alt="La Boutique de la Limpieza"
              />
              <h1>Políticas De Envíos</h1>
              <div className="legal-info-divider" aria-hidden="true" />

              <p className="legal-terms-intro">
                En La Boutique de la Limpieza® trabajamos para que recibas tus productos lo más rápido y cómodo posible.
              </p>

              <div className="legal-terms-content">
                <h2>Zona de entrega</h2>
                <p>
                  Realizamos entregas únicamente dentro de la Ciudad Autónoma de Buenos Aires (CABA) y en el Gran Buenos Aires, en las localidades de: Vicente Lopez, San Isidro, San Fernando, San Martin, Tres de Febrero, Hurlingham, Ituzaingo, Morón, La Matanza Norte, Lomas de Zamora, Lanus, Avellaneda, Quilmes, Berazategui, Florencio Varela, Almirante Brown, Esteban Echeverría, Ezeiza, La Matanza Sur, Merlo, Moreno, San Miguel, José C. Paz, Malvinas Argentinas, Tigre, Escobar, Pilar, Luján, General Rodríguez, Marcos Paz, Cañuelas, San Vicente, Guernica, La Plata, Ensenada, Berisso, Campana, Zárate.
                </p>

                <h2>Tiempo de entrega</h2>
                <p>El plazo estándar de entrega es de 3 a 4 días hábiles.</p>
                <p>Realizamos entregas únicamente de lunes a viernes.</p>
                <p>
                  En fechas especiales o promociones, este tiempo puede extenderse, pero siempre te mantendremos informado.
                </p>

                <h2>Costo de envío</h2>
                <p>Envío gratuito para compras mayores a $50.000 ARS.</p>
                <p>
                  Para compras menores a ese monto, el costo de envío es fijo: $5.000 ARS dentro de CABA y $7.000 ARS en el Gran Buenos Aires.
                </p>

                <h2>Modalidades</h2>
                <p>Entrega a domicilio.</p>
                <p>Retiro en el local (con coordinación previa).</p>

                <p>
                  Si tenés dudas sobre tu entrega, escribinos por WhatsApp o correo electrónico. ¡Estamos para ayudarte!
                </p>
              </div>
            </section>
          ) : activeSection === "fiscal-data" ? (
            <section className="legal-info-view legal-terms-view" aria-label="Datos fiscales">
              <img
                className="legal-info-logo"
                src="/fotos/logo/La boutique de la limpiezalogo.webp"
                alt="La Boutique de la Limpieza"
              />
              <h1>Datos fiscales</h1>
              <div className="legal-info-divider" aria-hidden="true" />

              <div className="legal-terms-content legal-fiscal-content">
                <p><strong>Acceso a la Foto de Data Fiscal</strong></p>
                <p>
                  Podés ver nuestra constancia de inscripción y denunciar irregularidades en AFIP ingresando al siguiente enlace:
                </p>
                <p>
                  Denuncias y Data Fiscal – AFIP:{" "}
                  <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml?action=SYSTEM&system=denuncias" target="_blank" rel="noreferrer">ver mas</a>
                </p>
                <a
                  href="https://auth.afip.gob.ar/contribuyente_/login.xhtml?action=SYSTEM&system=denuncias"
                  target="_blank"
                  rel="noreferrer"
                  className="legal-fiscal-image-link"
                >
                  <img src="/fotos/DataFiscal.webp" alt="Data Fiscal AFIP" />
                </a>
              </div>
            </section>
          ) : activeSection === "complaints-book" ? (
            <section className="legal-info-view legal-terms-view" aria-label="Libro de Quejas Online">
              <img
                className="legal-info-logo"
                src="/fotos/logo/La boutique de la limpiezalogo.webp"
                alt="La Boutique de la Limpieza"
              />
              <h1>Libro de Quejas Online</h1>
              <div className="legal-info-divider" aria-hidden="true" />

              <div className="legal-terms-content">
                <p>
                  En cumplimiento con la normativa vigente de{" "}
                  <a
                    href="https://www.argentina.gob.ar/economia/industria-y-comercio/defensadelconsumidor?utm_source=chatgpt.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Defensa al Consumidor ↗
                  </a>
                  , ponemos a disposición nuestro Libro de Quejas Online.
                </p>
                <p>
                  Si tenés un reclamo, queja o sugerencia, podés completarlo en el formulario de esta página. Nuestro equipo lo revisará y dará respuesta en un plazo máximo de 10 días hábiles.
                </p>
                <p>
                  También podés realizar tu reclamo directamente en el portal oficial de la Dirección Nacional de Defensa del Consumidor ↗:{" "}
                  <a
                    href="https://autogestion.produccion.gob.ar/consumidores?utm_source=chatgpt.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    https://autogestion.produccion.gob.ar/consumidores?utm_source=chatgpt.com
                  </a>
                </p>

                <form className="legal-complaints-form" onSubmit={handleComplaintSubmit}>
                  <div className="legal-complaints-grid">
                    <label>
                      <span>Nombre*</span>
                      <input
                        type="text"
                        name="firstName"
                        placeholder="Escribe tu nombre"
                        value={complaintForm.firstName}
                        onChange={handleComplaintInputChange}
                        required
                      />
                    </label>

                    <label>
                      <span>Apellido*</span>
                      <input
                        type="text"
                        name="lastName"
                        placeholder="Escribe tu apellido"
                        value={complaintForm.lastName}
                        onChange={handleComplaintInputChange}
                        required
                      />
                    </label>

                    <label>
                      <span>Email*</span>
                      <input
                        type="email"
                        name="email"
                        placeholder="ejemplo@correo.com"
                        value={complaintForm.email}
                        onChange={handleComplaintInputChange}
                        required
                      />
                    </label>

                    <label>
                      <span>Teléfono</span>
                      <input
                        type="text"
                        name="phone"
                        placeholder="Ingresa tu número de teléfono"
                        value={complaintForm.phone}
                        onChange={handleComplaintInputChange}
                      />
                    </label>

                    <label>
                      <span>Número de pedido</span>
                      <input
                        type="text"
                        name="orderNumber"
                        placeholder="12345"
                        value={complaintForm.orderNumber}
                        onChange={handleComplaintInputChange}
                      />
                    </label>

                    <label>
                      <span>Motivo de la queja/reclamo/sugerencia*</span>
                      <select
                        name="reason"
                        value={complaintForm.reason}
                        onChange={handleComplaintInputChange}
                        required
                      >
                        <option value="">Elige uno</option>
                        <option value="queja">Queja</option>
                        <option value="reclamo">Reclamo</option>
                        <option value="sugerencia">Sugerencia</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    <span>Mensaje detallado</span>
                    <textarea
                      name="message"
                      placeholder="Contanos qué sucedió y cómo podemos ayudarte."
                      value={complaintForm.message}
                      onChange={handleComplaintInputChange}
                      rows={5}
                    />
                  </label>

                  <label>
                    <span>Carga de archivo</span>
                    <input type="file" onChange={handleComplaintAttachmentChange} />
                    {complaintAttachmentName && <small>{complaintAttachmentName}</small>}
                  </label>

                  <button type="submit" className="legal-complaints-submit" disabled={isComplaintSubmitting}>
                    {isComplaintSubmitting ? "Enviando..." : "registrar reclamo"}
                  </button>

                  {complaintSubmitMessage && <p className="legal-complaints-message">{complaintSubmitMessage}</p>}
                </form>
              </div>
            </section>
          ) : activeSection === "commercial-information" ? (
            <section className="legal-info-view legal-terms-view" aria-label="Información comercial">
              <img
                className="legal-info-logo"
                src="/fotos/logo/La boutique de la limpiezalogo.webp"
                alt="La Boutique de la Limpieza"
              />
              <h1>Información Comercial</h1>
              <div className="legal-info-divider" aria-hidden="true" />

              <div className="legal-terms-content">
                <p><strong>Nombre comercial:</strong><br />La Boutique de la Limpieza®</p>

                <p><strong>Domicilio:</strong><br />Acevedo 200, C1414, Ciudad Autónoma de Buenos Aires, Argentina</p>

                <p><strong>Razón social:</strong><br />Nahuel Rosenberg</p>

                <p>
                  <strong>CUIT:</strong><br />
                  20409938311 (Constancia de CUIL Link: <a href="/fotos/DataFiscal.webp" target="_blank" rel="noreferrer">ver más</a>)
                </p>

                <p><strong>Condición frente al IVA:</strong><br />Responsable inscripto</p>

                <p><strong>Correo de contacto:</strong><br />Laboutiqueacevedo200@gmail.com</p>

                <p><strong>Teléfono / WhatsApp de atención:</strong><br />+54 9 11 5501-8399</p>

                <p><strong>Presencial en el local:</strong><br />Lunes a viernes de 9:00 a 13:00 y de 15:30 a 18:30 hs</p>

                <p><strong>Online (web y WhatsApp):</strong><br />Lunes a viernes de 9:00 a 13:00 y de 15:30 a 18:30 hs</p>
              </div>
            </section>
          ) : activeSection === "privacy-policies" ? (
            <section className="legal-info-view legal-terms-view" aria-label="Políticas de privacidad">
              <img
                className="legal-info-logo"
                src="/fotos/logo/La boutique de la limpiezalogo.webp"
                alt="La Boutique de la Limpieza"
              />
              <h1>Políticas De Privacidad</h1>
              <div className="legal-info-divider" aria-hidden="true" />

              <div className="legal-terms-content">
                <p>
                  En La Boutique de la Limpieza®, valoramos y respetamos tu privacidad. Por eso, todos los datos personales que nos brindes serán tratados con confidencialidad y conforme a lo establecido por la Ley 25.326 de Protección de los Datos Personales.
                </p>

                <h2>¿Qué datos recolectamos?</h2>
                <p>Podemos solicitar información como:</p>
                <ul>
                  <li>Nombre y apellido</li>
                  <li>Dirección de correo electrónico</li>
                  <li>Teléfono</li>
                  <li>Dirección de entrega</li>
                  <li>Datos necesarios para la facturación o contacto</li>
                </ul>

                <h2>¿Para qué usamos tus datos?</h2>
                <p>Tus datos serán utilizados únicamente para:</p>
                <ul>
                  <li>Gestionar y enviar tus pedidos</li>
                  <li>Brindarte asistencia y atención personalizada</li>
                  <li>Enviarte promociones, novedades o comunicaciones relacionadas a nuestros productos (solo si diste tu consentimiento)</li>
                </ul>

                <h2>¿Compartimos tus datos?</h2>
                <p>
                  No compartimos tus datos con terceros ajenos a la operación de este sitio. Solo podrán ser accedidos por nuestro equipo interno o proveedores logísticos/tecnológicos que colaboran en la gestión de los pedidos, y únicamente para cumplir con el servicio solicitado.
                </p>

                <h2>¿Qué derechos tenés?</h2>
                <p>Como titular de tus datos, podés en cualquier momento:</p>
                <ul>
                  <li>Acceder a la información que tenemos sobre vos</li>
                  <li>Solicitar la rectificación, actualización o eliminación de tus datos</li>
                  <li>Retirar tu consentimiento para comunicaciones comerciales</li>
                </ul>

                <p>
                  Podés ejercer estos derechos escribiéndonos a: <a href="mailto:laboutiqueacevedo200@gmail.com">laboutiqueacevedo200@gmail.com</a>
                </p>

                <p>Nos comprometemos a responder en un plazo razonable conforme a la ley vigente.</p>
              </div>
            </section>
          ) : activeSection === "withdrawal-button" ? (
            <section className="legal-info-view legal-terms-view" aria-label="Botón de Arrepentimiento">
              <img
                className="legal-info-logo"
                src="/fotos/logo/La boutique de la limpiezalogo.webp"
                alt="La Boutique de la Limpieza"
              />
              <h1>Botón de Arrepentimiento</h1>
              <div className="legal-info-divider" aria-hidden="true" />

              <div className="legal-terms-content">
                <p>
                  De acuerdo con la Ley de Defensa del Consumidor, tenés derecho a solicitar la cancelación de tu compra dentro de los 10 días corridos posteriores a la misma. Para gestionar tu solicitud, completá el siguiente formulario con tus datos de contacto y asegurate de ingresar el número de pedido correspondiente.
                </p>

                <p>
                  Una vez recibido el formulario, nuestro equipo revisará tu solicitud y se pondrá en contacto contigo a la brevedad.
                </p>

                <h2>Solicitud de Cancelación de Pedido</h2>

                <form className="legal-complaints-form" onSubmit={handleWithdrawalSubmit}>
                  <div className="legal-complaints-grid">
                    <label>
                      <span>Nombre*</span>
                      <input
                        type="text"
                        name="firstName"
                        placeholder="Escribe tu nombre"
                        value={withdrawalForm.firstName}
                        onChange={handleWithdrawalInputChange}
                        required
                      />
                    </label>

                    <label>
                      <span>Apellido*</span>
                      <input
                        type="text"
                        name="lastName"
                        placeholder="Escribe tu apellido"
                        value={withdrawalForm.lastName}
                        onChange={handleWithdrawalInputChange}
                        required
                      />
                    </label>

                    <label>
                      <span>Correo electrónico*</span>
                      <input
                        type="email"
                        name="email"
                        placeholder="ejemplo@correo.com"
                        value={withdrawalForm.email}
                        onChange={handleWithdrawalInputChange}
                        required
                      />
                    </label>

                    <label>
                      <span>Teléfono*</span>
                      <input
                        type="text"
                        name="phone"
                        placeholder="Ingresa tu número de teléfono"
                        value={withdrawalForm.phone}
                        onChange={handleWithdrawalInputChange}
                        required
                      />
                    </label>

                    <label>
                      <span>Número de pedido*</span>
                      <input
                        type="text"
                        name="orderNumber"
                        placeholder="12345"
                        value={withdrawalForm.orderNumber}
                        onChange={handleWithdrawalInputChange}
                        required
                      />
                    </label>
                  </div>

                  <label>
                    <span>Message*</span>
                    <textarea
                      name="message"
                      placeholder="Escribe tu mensaje aquí"
                      value={withdrawalForm.message}
                      onChange={handleWithdrawalInputChange}
                      rows={5}
                      required
                    />
                  </label>

                  <label>
                    <span>Carga de archivos</span>
                    <input type="file" onChange={handleWithdrawalAttachmentChange} />
                    {withdrawalAttachmentName && <small>{withdrawalAttachmentName}</small>}
                  </label>

                  <button type="submit" className="legal-complaints-submit" disabled={isWithdrawalSubmitting}>
                    {isWithdrawalSubmitting ? "Enviando..." : "Enviar"}
                  </button>

                  {withdrawalSubmitMessage && <p className="legal-complaints-message">{withdrawalSubmitMessage}</p>}
                </form>
              </div>
            </section>
          ) : activeSection === "cart" ? (
            <section className="cart-view" aria-label="Carrito de compras">
              <div className="cart-view-header">
                <h1>Mi carrito</h1>
                <button type="button" className="cart-continue-btn" onClick={() => setActiveSection("home")}>
                  Seguir navegando ›
                </button>
              </div>

              {!cart.length ? (
                <div className="cart-view-empty">
                  {/* Hero empty state */}
                  <div className="cart-view-empty-hero">
                    <span className="cart-view-empty-icon" aria-hidden="true">
                      <svg viewBox="0 0 80 80" width="80" height="80">
                        <circle cx="40" cy="40" r="38" fill="#eff6ff" stroke="#1877f2" strokeWidth="1.5" opacity=".6"/>
                        <path fill="#1877f2" opacity=".25" d="M52 50H26c-.4 0-.8-.3-1-.6s-.3-.8-.2-1.1l2.9-7.3L24.8 16H16v-3h10.5c.7 0 1.3.5 1.5 1.3l3 28.5c0 .3 0 .5-.2.7L28.6 48H54z"/>
                        <path fill="#1877f2" d="M30 57a4 4 0 1 1 0 8 4 4 0 0 1 0-8m0 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m20-2.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8m0 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/>
                        <path fill="none" stroke="#1877f2" strokeWidth="2" strokeLinecap="round" d="M36 30h8m-4-4v8"/>
                      </svg>
                    </span>
                    <h2 className="cart-view-empty-title">Tu carrito está vacío</h2>
                    <p className="cart-view-empty-sub">Descubrí nuestros productos y armá tu pedido ideal</p>

                    <div className="cart-view-empty-actions">
                      <button type="button" className="cart-view-empty-cta" onClick={() => setActiveSection("home")}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                        Explorar productos
                      </button>
                      <button type="button" className="cart-view-empty-secondary" onClick={() => { setIsSmartOrderOpen(true); }}>
                        <img src="/fotos/iconos%20general/lineicons--open-ai.svg" alt="" width="18" height="18" />
                        Pedido Inteligente
                      </button>
                      {auth.user && myOrders.length > 0 && (
                        <button type="button" className="cart-view-empty-secondary cart-view-empty-repeat" onClick={() => { setAccountInitialTab("pedidos"); setActiveSection("account"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                          <img src="/fotos/iconos%20general/uim--repeat.svg" alt="" width="18" height="18" />
                          Repetir pedido
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Top brands quick access */}
                  {cartViewRecommendations.topBrands.length > 0 && (
                    <section className="cart-view-empty-brands" aria-label="Marcas populares">
                      <h3 className="cart-view-empty-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                        Marcas populares
                      </h3>
                      <div className="cart-view-empty-brand-chips">
                        {cartViewRecommendations.topBrands.map((brand) => (
                          <button key={brand} type="button" className="cart-view-empty-brand-chip" onClick={() => { setSearchInput(brand); setSearchTerm(brand); setActiveSection("home"); scrollToPageTop(); }}>
                            {brand}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Featured products */}
                  {cartViewRecommendations.featured.length > 0 && (
                    <section className="cart-view-empty-featured" aria-label="Productos recomendados">
                      <h3 className="cart-view-empty-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        Productos recomendados para vos
                      </h3>
                      <div className="cart-view-empty-products-grid">
                        {cartViewRecommendations.featured.map((product) => {
                          const qty = getCatalogQuantity(product.id);
                          const stockLimit = getStockLimit(product.stock);
                          const isQtyAtLimit = stockLimit !== null && qty >= stockLimit;
                          const { primaryImageUrl, secondaryImageUrl, primaryImageAlt, secondaryImageAlt } = getCardImagePair(product);
                          return (
                            <article key={product.id} className="product-card" role="button" tabIndex={0} onClick={() => openProductPreview(product)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openProductPreview(product); } }}>
                              <button type="button" className={`favorite-btn card-favorite-btn ${isProductFavorite(product.id) ? "is-active" : ""}`} onClick={(e) => handleToggleFavorite(product, e)} aria-label={isProductFavorite(product.id) ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}>
                                <span aria-hidden="true">★</span>
                              </button>
                              <figure className={`product-image-stack${secondaryImageUrl ? " has-hover-image" : ""}`}>
                                <img className="product-image product-image-primary" src={primaryImageUrl} alt={primaryImageAlt} loading="lazy" />
                                {secondaryImageUrl && <img className="product-image product-image-secondary" src={secondaryImageUrl} alt={secondaryImageAlt} loading="lazy" />}
                              </figure>
                              <div className="product-card-content">
                                {product.brand && <p className="product-brand">{product.brand}</p>}
                                <h2 className="product-title">{product.name}</h2>
                                <p className="product-price">${Number(product.price).toLocaleString("es-AR")} ARS</p>
                                <div className="product-qty" aria-label={`Cantidad para ${product.name}`}>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); updateCatalogQuantity(product.id, -1); }}>-</button>
                                  <span>{qty}</span>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); updateCatalogQuantity(product.id, 1, stockLimit ?? 99); }} disabled={isQtyAtLimit}>+</button>
                                </div>
                                <button type="button" className="product-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(product, qty); }}>
                                  <span className="product-add-icon" aria-hidden="true">
                                    <svg viewBox="0 0 50 50" style={{width: '1.1em', height: '1.1em', display: 'inline-block', verticalAlign: 'middle'}}>
                                      <path fill="currentColor" d="M35 34H13c-.3 0-.6-.2-.8-.4s-.2-.6-.1-.9l1.9-4.8L12.1 10H6V8h7c.5 0 .9.4 1 .9l2 19c0 .2 0 .3-.1.5L14.5 32H36z"/>
                                      <path fill="currentColor" d="m15.2 29l-.4-2L38 22.2V14H14v-2h25c.6 0 1 .4 1 1v10c0 .5-.3.9-.8 1zM36 40c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-24 6c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
                                    </svg>
                                  </span>
                                  <span>Agregar al carrito</span>
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Products by category */}
                  {cartViewRecommendations.byCategory.map((group) => (
                    <section key={group.name} className="cart-view-empty-category-section" aria-label={group.name}>
                      <div className="cart-view-empty-category-header">
                        <h3 className="cart-view-empty-section-title">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                          {group.name}
                        </h3>
                        <button type="button" className="cart-view-empty-see-all" onClick={() => { handleSelectCategory(group.name); }}>
                          Ver todos ›
                        </button>
                      </div>
                      <div className="cart-view-empty-products-grid">
                        {group.items.map((product) => {
                          const qty = getCatalogQuantity(product.id);
                          const stockLimit = getStockLimit(product.stock);
                          const isQtyAtLimit = stockLimit !== null && qty >= stockLimit;
                          const { primaryImageUrl, secondaryImageUrl, primaryImageAlt, secondaryImageAlt } = getCardImagePair(product);
                          return (
                            <article key={product.id} className="product-card" role="button" tabIndex={0} onClick={() => openProductPreview(product)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openProductPreview(product); } }}>
                              <button type="button" className={`favorite-btn card-favorite-btn ${isProductFavorite(product.id) ? "is-active" : ""}`} onClick={(e) => handleToggleFavorite(product, e)} aria-label={isProductFavorite(product.id) ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}>
                                <span aria-hidden="true">★</span>
                              </button>
                              <figure className={`product-image-stack${secondaryImageUrl ? " has-hover-image" : ""}`}>
                                <img className="product-image product-image-primary" src={primaryImageUrl} alt={primaryImageAlt} loading="lazy" />
                                {secondaryImageUrl && <img className="product-image product-image-secondary" src={secondaryImageUrl} alt={secondaryImageAlt} loading="lazy" />}
                              </figure>
                              <div className="product-card-content">
                                {product.brand && <p className="product-brand">{product.brand}</p>}
                                <h2 className="product-title">{product.name}</h2>
                                <p className="product-price">${Number(product.price).toLocaleString("es-AR")} ARS</p>
                                <div className="product-qty" aria-label={`Cantidad para ${product.name}`}>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); updateCatalogQuantity(product.id, -1); }}>-</button>
                                  <span>{qty}</span>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); updateCatalogQuantity(product.id, 1, stockLimit ?? 99); }} disabled={isQtyAtLimit}>+</button>
                                </div>
                                <button type="button" className="product-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(product, qty); }}>
                                  <span className="product-add-icon" aria-hidden="true">
                                    <svg viewBox="0 0 50 50" style={{width: '1.1em', height: '1.1em', display: 'inline-block', verticalAlign: 'middle'}}>
                                      <path fill="currentColor" d="M35 34H13c-.3 0-.6-.2-.8-.4s-.2-.6-.1-.9l1.9-4.8L12.1 10H6V8h7c.5 0 .9.4 1 .9l2 19c0 .2 0 .3-.1.5L14.5 32H36z"/>
                                      <path fill="currentColor" d="m15.2 29l-.4-2L38 22.2V14H14v-2h25c.6 0 1 .4 1 1v10c0 .5-.3.9-.8 1zM36 40c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-24 6c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
                                    </svg>
                                  </span>
                                  <span>Agregar al carrito</span>
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}

                  {/* Shipping & Trust badges */}
                  <section className="cart-view-empty-trust" aria-label="Beneficios">
                    <div className="cart-view-empty-trust-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      <div>
                        <strong>Envío gratis</strong>
                        <span>En compras superiores a $50.000</span>
                      </div>
                    </div>
                    <div className="cart-view-empty-trust-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <div>
                        <strong>Compra segura</strong>
                        <span>Pagos protegidos con MercadoPago</span>
                      </div>
                    </div>
                    <div className="cart-view-empty-trust-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <div>
                        <strong>Retiro en el local</strong>
                        <span>Sin costo adicional</span>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="cart-checkout-layout">
                  <div className="cart-products-panel">
                    <ul className="cart-list">
                      {cart.map((item) => (
                        <li key={item.cartKey || `${item.id}:base`} className="cart-line">
                          <div className="cart-line-main">
                            <button
                              type="button"
                              className="cart-item-image-btn"
                              onClick={() => openCartItemProduct(item)}
                              aria-label={`Ver detalle de ${item.name}`}
                            >
                              <img
                                className="cart-line-image"
                                src={getProductImageUrl(item)}
                                alt={getProductImageAlt(item, 0)}
                              />
                            </button>

                            <div>
                              <h2>
                                <button
                                  type="button"
                                  className="cart-item-title-btn"
                                  onClick={() => openCartItemProduct(item)}
                                  aria-label={`Ver detalle de ${item.name}`}
                                >
                                  {item.name}
                                </button>
                              </h2>
                              {(item.variantPresentation || item.variantName) && (
                                <p>
                                  {item.variantPresentation ? `${item.variantPresentation}: ` : ""}
                                  {item.variantName}
                                </p>
                              )}
                              <p>{Number(item.price).toLocaleString("es-AR")},00 ARS</p>
                            </div>
                          </div>

                          <div className="cart-line-actions">
                            <div className="cart-qty-control" aria-label={`Cantidad de ${item.name}`}>
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.cartKey || `${item.id}:base`, item.quantity - 1)}
                                aria-label={`Quitar una unidad de ${item.name}`}
                              >
                                -
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.cartKey || `${item.id}:base`, item.quantity + 1)}
                                title={isCartItemAtStockLimit(item) ? "No hay mas stock disponible" : undefined}
                                aria-label={`Agregar una unidad de ${item.name}`}
                              >
                                +
                              </button>
                            </div>

                            {cartStockMessage
                              && cartStockMessageCartKey === (item.cartKey || `${item.id}:base`) && (
                              <p className="cart-item-stock-warning" role="status" aria-live="polite">
                                {cartStockMessage}
                              </p>
                            )}

                            <strong>
                              {(Number(item.price) * item.quantity).toLocaleString("es-AR")},00 ARS
                            </strong>

                            <button
                              type="button"
                              className="cart-remove-btn"
                              onClick={() => removeFromCart(item.cartKey || `${item.id}:base`)}
                              aria-label={`Eliminar ${item.name}`}
                            >
                              <svg viewBox="0 0 32 32" aria-hidden="true" style={{width: '1.2em', height: '1.2em'}}>
                                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 6H6l2 24h16l2-24H4m12 6v12m5-12l-1 12m-9-12l1 12m0-18l1-4h6l1 4"/>
                              </svg>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="cart-extra-actions" aria-label="Opciones del carrito">
                      <button
                        type="button"
                        className="cart-extra-link"
                        onClick={() => setIsCartPromoOpen((current) => !current)}
                      >
                        <span className="cart-extra-icon" aria-hidden="true"><img src="/fotos/iconos%20general/clarity--tag-solid.svg" alt="" width="18" height="18" /></span>
                        <span>Ingresar código promocional</span>
                      </button>
                      {isCartPromoOpen && (
                        <div className="cart-extra-panel" aria-label="Código promocional">
                          <input
                            ref={cartPromoInputRef}
                            type="text"
                            placeholder="P. ej., OFERTA50"
                            value={cartPromoCode}
                            onChange={(event) => setCartPromoCode(event.target.value)}
                          />
                          <button
                            type="button"
                            className="cart-extra-apply-btn"
                            onClick={handleApplyCartPromotion}
                            disabled={isApplyingCartPromo}
                          >
                            {isApplyingCartPromo ? "Aplicando..." : "Aplicar"}
                          </button>
                        </div>
                      )}
                      {isCartPromoOpen && cartPromoMessage && <p className="cart-promo-message">{cartPromoMessage}</p>}
                      {isCartPromoOpen && appliedCartPromoPercent !== null && (
                        <p className="cart-promo-percent">Descuento aplicado: {appliedCartPromoPercent}%</p>
                      )}

                      <button
                        type="button"
                        className="cart-extra-link"
                        onClick={() => setIsCartNoteOpen((current) => !current)}
                      >
                        <span className="cart-extra-icon" aria-hidden="true"><img src="/fotos/iconos%20general/clarity--note-solid.svg" alt="" width="18" height="18" /></span>
                        <span>Agregar una nota</span>
                      </button>
                      {isCartNoteOpen && (
                        <div className="cart-extra-panel" aria-label="Nota del pedido">
                          <textarea
                            rows={5}
                            placeholder="P. ej., Dejar el pedido en la puerta"
                            value={cartOrderNote}
                            onChange={(event) => {
                              setCartOrderNote(event.target.value);
                              setCartNoteMessage("");
                            }}
                          />
                        </div>
                      )}
                      {isCartNoteOpen && (
                        <div className="cart-note-actions">
                          <button type="button" className="cart-note-save-btn" onClick={handleSaveCartNote}>
                            Guardar nota
                          </button>
                        </div>
                      )}
                      {isCartNoteOpen && cartNoteMessage && <p className="cart-note-message">{cartNoteMessage}</p>}
                    </div>
                  </div>

                  <section className="checkout-box" aria-label="Finalizar compra">
                    <section className={`cart-free-shipping ${hasReachedFreeShipping ? "is-complete" : ""}`} aria-live="polite">
                      <p className="cart-free-shipping-message">
                        {hasReachedFreeShipping
                          ? "Ya desbloqueaste el envio gratis en este pedido."
                          : `Te faltan $${freeShippingRemaining.toLocaleString("es-AR")} ARS para tener envio gratis.`}
                      </p>
                      <div
                        className="cart-free-shipping-track"
                        role="progressbar"
                        aria-label="Progreso para envio gratis"
                        aria-valuemin={0}
                        aria-valuemax={FREE_SHIPPING_TARGET_ARS}
                        aria-valuenow={Math.round(Math.min(cartSubtotal, FREE_SHIPPING_TARGET_ARS))}
                      >
                        <span
                          className="cart-free-shipping-fill"
                          style={{ width: `${freeShippingProgressPercent.toFixed(2)}%` }}
                        />
                      </div>
                      <p className="cart-free-shipping-caption">Envio gratis a partir de $50.000 ARS</p>
                    </section>

                    <form className="checkout-form" onSubmit={handleCheckoutSubmit}>
                      <aside className="checkout-summary-card" aria-label="Resumen del pedido">
                        <h3>Resumen del pedido</h3>

                        <div className="checkout-summary-row">
                          <span>Subtotal</span>
                          <strong>{cartSubtotal.toLocaleString("es-AR")},00 ARS</strong>
                        </div>

                        {cartDiscount > 0 && (
                          <div className="checkout-summary-row">
                            <span>Descuento</span>
                            <strong>-{cartDiscount.toLocaleString("es-AR")} ARS</strong>
                          </div>
                        )}

                        <div className="checkout-summary-row">
                          <span>{checkoutForm.shippingMethod === "pickup" ? "Retiro en el local" : checkoutForm.shippingMethod === "delivery" ? (checkoutForm.shippingZone === "caba" ? "Envío a CABA" : "Envío a GBA") : "Envío"}</span>
                          <strong>{checkoutShippingSummaryLabel}</strong>
                        </div>

                        <div className="checkout-shipping-country">
                          Buenos Aires, Argentina
                        </div>

                        <div className="shipping-cards">
                          <button
                            type="button"
                            className={`shipping-card${checkoutShippingOptionValue === "pickup" ? " shipping-card--active" : ""}`}
                            onClick={() => setCheckoutForm((c) => ({ ...c, shippingMethod: "pickup", shippingZone: "", paymentMethod: c.paymentMethod, street: "", number: "", floor: "", apartment: "", city: "Buenos Aires", province: "Buenos Aires", postalCode: "", notes: "" }))}
                          >
                            <span className="shipping-card-icon">
                              <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>
                            </span>
                            <span className="shipping-card-info">
                              <span className="shipping-card-label">Retiro en el local</span>
                              <span className="shipping-card-sub">Villa Crespo · Lun a Vie</span>
                            </span>
                            <span className="shipping-card-price shipping-card-free">Gratis</span>
                            <span className="shipping-card-radio" />
                          </button>

                          <button
                            type="button"
                            className={`shipping-card${checkoutShippingOptionValue === "delivery-caba" ? " shipping-card--active" : ""}`}
                            onClick={() => setCheckoutForm((c) => ({ ...c, shippingMethod: "delivery", shippingZone: "caba", paymentMethod: "mercadopago", street: "", number: "", floor: "", apartment: "", city: "Buenos Aires", province: "Buenos Aires", postalCode: "", notes: "" }))}
                          >
                            <span className="shipping-card-icon">
                              <svg viewBox="0 0 24 24"><circle cx="5" cy="17" r="2.5"/><circle cx="19" cy="17" r="2.5"/><path d="M5 14.5l3-7h3.5l2.5 5h5.5"/><path d="M8 7.5h3"/></svg>
                            </span>
                            <span className="shipping-card-info">
                              <span className="shipping-card-label">Envío a CABA</span>
                              <span className="shipping-card-sub">1–2 días hábiles</span>
                            </span>
                            <span className={`shipping-card-price${hasReachedFreeShipping ? " shipping-card-free" : ""}`}>
                              {hasReachedFreeShipping ? "Gratis" : "$5.000"}
                            </span>
                            <span className="shipping-card-radio" />
                          </button>

                          <button
                            type="button"
                            className={`shipping-card${checkoutShippingOptionValue === "delivery-gba" ? " shipping-card--active" : ""}`}
                            onClick={() => setCheckoutForm((c) => ({ ...c, shippingMethod: "delivery", shippingZone: "gba", paymentMethod: "mercadopago", street: "", number: "", floor: "", apartment: "", city: "Buenos Aires", province: "Buenos Aires", postalCode: "", notes: "" }))}
                          >
                            <span className="shipping-card-icon">
                              <svg viewBox="0 0 24 24"><path d="M2 4h12v13H2z"/><path d="M14 9h4l3 3v5h-7"/><circle cx="6.5" cy="18.5" r="2"/><circle cx="18" cy="18.5" r="2"/></svg>
                            </span>
                            <span className="shipping-card-info">
                              <span className="shipping-card-label">Envío a GBA</span>
                              <span className="shipping-card-sub">1–3 días hábiles</span>
                            </span>
                            <span className={`shipping-card-price${hasReachedFreeShipping ? " shipping-card-free" : ""}`}>
                              {hasReachedFreeShipping ? "Gratis" : "$7.000"}
                            </span>
                            <span className="shipping-card-radio" />
                          </button>
                        </div>

                        {welcomeDiscountAmount > 0 && (
                          <div className="checkout-summary-row" style={{ background: '#eff6ff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #1a4ac8' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                              <span style={{ fontWeight: 600, color: '#1a4ac8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <svg viewBox="0 0 64 64" style={{width: '15px', height: '15px', display: 'block'}}>
                                  <path fill="#1877f2" d="M51.429 15.856c4.558-4.299-.715-9.875-10.687-6.421c-.587.204-1.133.419-1.648.642c.977-1.876 2.42-3.924 4.58-5.885c0 0-4.034 1.449-5.898 1.082C35.464 4.819 34.739 2 34.739 2s-2.405 5.238-3.63 9.349c-1.754-3.532-3.697-6.969-3.697-6.969s-1.037 2.404-2.936 3.318c-1.531.74-7.829 1.378-7.829 1.378c2.1 1.074 3.903 2.401 5.433 3.774c-1.609-.426-3.446-.746-5.547-.898c-8.344-.605-11.621 2.372-10.505 5.313L2 17.394l2.192 8.219L5.554 26c3.232 10.949 2.45 23.098 2.44 23.235l-.055.792l.754.222C20.766 53.805 31.735 62 31.735 62s14.222-9.412 22.042-11.753l.684-.205l.014-.72c.004-.17.346-15.334 4.271-25.218c.276-.039.536-.07.759-.084l.827-.05l.083-.832c.003-.033.341-4.796 1.586-6.739zM4.587 19.7l6.483 1.759v4.063l-5.381-1.528zm10.074 30.512a70 70 0 0 0-4.681-1.63c.128-2.822.313-12.549-2.233-21.96l4.71 1.338c.912 4.023 2.426 12.311 2.204 22.252m7.893-35.169c8.094.586 9.517 4.764 9.517 4.764s-4.931 1.803-7.978 1.803c-9.942 0-11.378-7.28-1.539-6.567m9.988 5.379l8.126.921l-10.13 2.451l-5.786-1.293zm-9.729 3.661l6.76 1.51v5.184l-6.979-1.947zm8.041 34.937c-1.476-1.096-3.936-2.787-7.202-4.6c.259-4.777.29-17.541.291-23.198l6.911 1.963zm9.046-4.356a138 138 0 0 0-7.1 4.496V32.29a511 511 0 0 1 8.162-2.917c-.587 5.658-.954 20.424-1.062 25.291m3.28-27.832s-9.738 3.125-11.659 3.834V25.58l11.811-2.858zm-1.2-7.461c-4.559 1.168-9.408.344-9.408.344s-.909-4.465 6.451-7.014c8.946-3.099 12.483 4.229 2.957 6.67m6.711-1.699l5.796.326l-3.481.843l-4.157-.41c.673-.234 1.284-.49 1.842-.759m3.856 30.9c-1.447.473-2.973 1.092-4.511 1.793c.011-4.684.297-15.066 2.467-24.145c2.231-.688 4.299-1.275 5.987-1.672c-3.227 8.986-3.838 20.96-3.943 24.024m6.038-26.431s-3.201.938-5.245 1.502l.514-3.468l5.565-1.346c-.456 1.255-.834 3.312-.834 3.312"/>
                                </svg>
                                Descuento de Bienvenida (10%)
                              </span>
                              <span style={{ fontSize: '11px', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg viewBox="0 0 24 24" style={{width: '12px', height: '12px', display: 'block'}}>
                                  <path fill="#92400e" fillRule="evenodd" d="m12.6 11.503l3.891 3.891l-.848.849L11.4 12V6h1.2zM12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m0-1.2a8.8 8.8 0 1 0 0-17.6a8.8 8.8 0 0 0 0 17.6"/>
                                  <path className="clock-animated" fill="#92400e" fillRule="evenodd" d="m12.6 11.503l3.891 3.891l-.848.849L11.4 12V6h1.2z" style={{transformOrigin: '12px 12px'}}/>
                                </svg>
                                Expira en: <WelcomeDiscountTimer expiresAt={auth.user?.welcomeDiscountExpiresAt} compact />
                              </span>
                            </div>
                            <span style={{ fontWeight: 700, color: '#059669', fontSize: '1.1rem' }}>
                              -${welcomeDiscountAmount.toLocaleString("es-AR")} ARS
                            </span>
                          </div>
                        )}

                        <div className="checkout-summary-row checkout-total-row">
                          <span>Total</span>
                          <strong>{checkoutTotal.toLocaleString("es-AR")},00 ARS</strong>
                        </div>

                        <button type="button" disabled={isCheckoutLoading} onClick={handleOpenCheckoutDetails}>
                          Finalizar compra
                        </button>

                        <p className="checkout-security-note">
                          <svg viewBox="0 0 50 50" aria-hidden="true" style={{width: '1.2em', height: '1.2em', display: 'inline-block', verticalAlign: 'middle', marginRight: '0.35em', transform: 'translateY(-0.05em)'}}>
                            <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                              <path stroke="#344054" d="M25 35.417v-2.084m3.125-3.125a3.125 3.125 0 1 1-6.25 0a3.125 3.125 0 0 1 6.25 0"/>
                              <path stroke="#1877f2" d="M39.583 41.667V20.833c0-1.15-.932-2.083-2.083-2.083h-25c-1.15 0-2.083.933-2.083 2.083v20.834c0 1.15.932 2.083 2.083 2.083h25c1.15 0 2.083-.933 2.083-2.083m-6.25-22.917v-4.167a8.333 8.333 0 1 0-16.666 0v4.167"/>
                            </g>
                          </svg>
                          Pago seguro
                        </p>
                      </aside>
                    </form>
                  </section>
                </div>
              )}

              {/* Recommendations — always visible */}
              {cartViewRecommendations.featured.length > 0 && (
                <div className="cart-view-recs-always">
                  {/* Top brands */}
                  {cartViewRecommendations.topBrands.length > 0 && (
                    <section className="cart-view-empty-brands" aria-label="Marcas populares">
                      <h3 className="cart-view-empty-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                        Marcas populares
                      </h3>
                      <div className="cart-view-empty-brand-chips">
                        {cartViewRecommendations.topBrands.map((brand) => (
                          <button key={brand} type="button" className="cart-view-empty-brand-chip" onClick={() => { setSearchInput(brand); setSearchTerm(brand); setActiveSection("home"); scrollToPageTop(); }}>
                            {brand}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Featured products */}
                  <section className="cart-view-empty-featured" aria-label="Productos recomendados">
                    <h3 className="cart-view-empty-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      {cart.length ? "Completá tu pedido" : "Productos recomendados para vos"}
                    </h3>
                    <div className="cart-view-empty-products-grid">
                      {cartViewRecommendations.featured.map((product) => {
                        const qty = getCatalogQuantity(product.id);
                        const stockLimit = getStockLimit(product.stock);
                        const isQtyAtLimit = stockLimit !== null && qty >= stockLimit;
                        const { primaryImageUrl, secondaryImageUrl, primaryImageAlt, secondaryImageAlt } = getCardImagePair(product);
                        return (
                          <article key={product.id} className="product-card" role="button" tabIndex={0} onClick={() => openProductPreview(product)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openProductPreview(product); } }}>
                            <button type="button" className={`favorite-btn card-favorite-btn ${isProductFavorite(product.id) ? "is-active" : ""}`} onClick={(e) => handleToggleFavorite(product, e)} aria-label={isProductFavorite(product.id) ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}>
                              <span aria-hidden="true">★</span>
                            </button>
                            <figure className={`product-image-stack${secondaryImageUrl ? " has-hover-image" : ""}`}>
                              <img className="product-image product-image-primary" src={primaryImageUrl} alt={primaryImageAlt} loading="lazy" />
                              {secondaryImageUrl && <img className="product-image product-image-secondary" src={secondaryImageUrl} alt={secondaryImageAlt} loading="lazy" />}
                            </figure>
                            <div className="product-card-content">
                              {product.brand && <p className="product-brand">{product.brand}</p>}
                              <h2 className="product-title">{product.name}</h2>
                              <p className="product-price">${Number(product.price).toLocaleString("es-AR")} ARS</p>
                              <div className="product-qty" aria-label={`Cantidad para ${product.name}`}>
                                <button type="button" onClick={(e) => { e.stopPropagation(); updateCatalogQuantity(product.id, -1); }}>-</button>
                                <span>{qty}</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); updateCatalogQuantity(product.id, 1, stockLimit ?? 99); }} disabled={isQtyAtLimit}>+</button>
                              </div>
                              <button type="button" className="product-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(product, qty); }}>
                                <span className="product-add-icon" aria-hidden="true">
                                  <svg viewBox="0 0 50 50" style={{width: '1.1em', height: '1.1em', display: 'inline-block', verticalAlign: 'middle'}}>
                                    <path fill="currentColor" d="M35 34H13c-.3 0-.6-.2-.8-.4s-.2-.6-.1-.9l1.9-4.8L12.1 10H6V8h7c.5 0 .9.4 1 .9l2 19c0 .2 0 .3-.1.5L14.5 32H36z"/>
                                    <path fill="currentColor" d="m15.2 29l-.4-2L38 22.2V14H14v-2h25c.6 0 1 .4 1 1v10c0 .5-.3.9-.8 1zM36 40c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-24 6c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
                                  </svg>
                                </span>
                                <span>Agregar al carrito</span>
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>

                  {/* By category */}
                  {cartViewRecommendations.byCategory.map((group) => (
                    <section key={group.name} className="cart-view-empty-category-section" aria-label={group.name}>
                      <div className="cart-view-empty-category-header">
                        <h3 className="cart-view-empty-section-title">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                          {group.name}
                        </h3>
                        <button type="button" className="cart-view-empty-see-all" onClick={() => { handleSelectCategory(group.name); }}>
                          Ver todos ›
                        </button>
                      </div>
                      <div className="cart-view-empty-products-grid">
                        {group.items.map((product) => {
                          const qty = getCatalogQuantity(product.id);
                          const stockLimit = getStockLimit(product.stock);
                          const isQtyAtLimit = stockLimit !== null && qty >= stockLimit;
                          const { primaryImageUrl, secondaryImageUrl, primaryImageAlt, secondaryImageAlt } = getCardImagePair(product);
                          return (
                            <article key={product.id} className="product-card" role="button" tabIndex={0} onClick={() => openProductPreview(product)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openProductPreview(product); } }}>
                              <button type="button" className={`favorite-btn card-favorite-btn ${isProductFavorite(product.id) ? "is-active" : ""}`} onClick={(e) => handleToggleFavorite(product, e)} aria-label={isProductFavorite(product.id) ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}>
                                <span aria-hidden="true">★</span>
                              </button>
                              <figure className={`product-image-stack${secondaryImageUrl ? " has-hover-image" : ""}`}>
                                <img className="product-image product-image-primary" src={primaryImageUrl} alt={primaryImageAlt} loading="lazy" />
                                {secondaryImageUrl && <img className="product-image product-image-secondary" src={secondaryImageUrl} alt={secondaryImageAlt} loading="lazy" />}
                              </figure>
                              <div className="product-card-content">
                                {product.brand && <p className="product-brand">{product.brand}</p>}
                                <h2 className="product-title">{product.name}</h2>
                                <p className="product-price">${Number(product.price).toLocaleString("es-AR")} ARS</p>
                                <div className="product-qty" aria-label={`Cantidad para ${product.name}`}>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); updateCatalogQuantity(product.id, -1); }}>-</button>
                                  <span>{qty}</span>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); updateCatalogQuantity(product.id, 1, stockLimit ?? 99); }} disabled={isQtyAtLimit}>+</button>
                                </div>
                                <button type="button" className="product-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(product, qty); }}>
                                  <span className="product-add-icon" aria-hidden="true">
                                    <svg viewBox="0 0 50 50" style={{width: '1.1em', height: '1.1em', display: 'inline-block', verticalAlign: 'middle'}}>
                                      <path fill="currentColor" d="M35 34H13c-.3 0-.6-.2-.8-.4s-.2-.6-.1-.9l1.9-4.8L12.1 10H6V8h7c.5 0 .9.4 1 .9l2 19c0 .2 0 .3-.1.5L14.5 32H36z"/>
                                      <path fill="currentColor" d="m15.2 29l-.4-2L38 22.2V14H14v-2h25c.6 0 1 .4 1 1v10c0 .5-.3.9-.8 1zM36 40c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-24 6c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
                                    </svg>
                                  </span>
                                  <span>Agregar al carrito</span>
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}

                  {/* Trust badges */}
                  <section className="cart-view-empty-trust" aria-label="Beneficios">
                    <div className="cart-view-empty-trust-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      <div>
                        <strong>Envío gratis</strong>
                        <span>En compras superiores a $50.000</span>
                      </div>
                    </div>
                    <div className="cart-view-empty-trust-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <div>
                        <strong>Compra segura</strong>
                        <span>Pagos protegidos con MercadoPago</span>
                      </div>
                    </div>
                    <div className="cart-view-empty-trust-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="28" height="28"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <div>
                        <strong>Retiro en el local</strong>
                        <span>Sin costo adicional</span>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </section>
          ) : activeSection === "checkout-details" ? (
            <section className="checkout-details-view" aria-label="Página de pago">
              <header className="checkout-details-header">
                <div className="checkout-details-title-wrap">
                  <img src="/fotos/logo/La boutique de la limpiezalogo.webp" alt="La Boutique de la Limpieza" className="checkout-details-logo" />
                  <h1>PÁGINA DE PAGO</h1>
                </div>
                <button type="button" className="checkout-details-back" onClick={() => setActiveSection("home")}>Seguir navegando</button>
              </header>

              <div className="checkout-details-layout">
                <section className="checkout-details-form-panel" aria-label="Detalles de envío">
                  <div className="checkout-session-banner">
                    Iniciaste sesión como {auth.user?.email || "invitado"}. <button type="button" onClick={handleLogout}>Cerrar sesión</button>
                  </div>

                  <h2>Detalles de envío</h2>

                  <form className="checkout-details-form" onSubmit={handleCheckoutSubmit}>
                    <div className="checkout-details-grid two-columns">
                      <label>
                        <span>Nombre *</span>
                        <input
                          type="text"
                          value={checkoutForm.firstName}
                          onChange={(event) => setCheckoutForm((current) => ({ ...current, firstName: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        <span>Apellido *</span>
                        <input
                          type="text"
                          value={checkoutForm.lastName}
                          onChange={(event) => setCheckoutForm((current) => ({ ...current, lastName: event.target.value }))}
                          required
                        />
                      </label>
                    </div>

                    <label>
                      <span>Teléfono *</span>
                      <input
                        type="text"
                        value={checkoutForm.customerPhone}
                        onChange={(event) => setCheckoutForm((current) => ({ ...current, customerPhone: event.target.value }))}
                        required
                      />
                    </label>

                    <span className="checkout-field-label">Método de entrega *</span>
                    <div className="shipping-cards shipping-cards--form">
                      <button
                        type="button"
                        className={`shipping-card${checkoutShippingOptionValue === "pickup" ? " shipping-card--active" : ""}`}
                        onClick={() => { setCheckoutForm((c) => ({ ...c, shippingMethod: "pickup", shippingZone: "", street: "", number: "", floor: "", apartment: "", city: "Buenos Aires", province: "Buenos Aires", postalCode: "", notes: "" })); setAddressValidationErrors([]); }}
                      >
                        <span className="shipping-card-icon">
                          <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>
                        </span>
                        <span className="shipping-card-info">
                          <span className="shipping-card-label">Retiro en el local</span>
                          <span className="shipping-card-sub">Villa Crespo · Lun a Vie</span>
                        </span>
                        <span className="shipping-card-price shipping-card-free">Gratis</span>
                        <span className="shipping-card-radio" />
                      </button>

                      <button
                        type="button"
                        className={`shipping-card${checkoutShippingOptionValue === "delivery-caba" ? " shipping-card--active" : ""}`}
                        onClick={() => { setCheckoutForm((c) => ({ ...c, shippingMethod: "delivery", shippingZone: "caba", street: "", number: "", floor: "", apartment: "", city: "Buenos Aires", province: "Buenos Aires", postalCode: "", notes: "" })); setAddressValidationErrors([]); }}
                      >
                        <span className="shipping-card-icon">
                          <svg viewBox="0 0 24 24"><circle cx="5" cy="17" r="2.5"/><circle cx="19" cy="17" r="2.5"/><path d="M5 14.5l3-7h3.5l2.5 5h5.5"/><path d="M8 7.5h3"/></svg>
                        </span>
                        <span className="shipping-card-info">
                          <span className="shipping-card-label">Envío a CABA</span>
                          <span className="shipping-card-sub">1–2 días hábiles</span>
                        </span>
                        <span className={`shipping-card-price${hasReachedFreeShipping ? " shipping-card-free" : ""}`}>
                          {hasReachedFreeShipping ? "Gratis" : "$5.000"}
                        </span>
                        <span className="shipping-card-radio" />
                      </button>

                      <button
                        type="button"
                        className={`shipping-card${checkoutShippingOptionValue === "delivery-gba" ? " shipping-card--active" : ""}`}
                        onClick={() => { setCheckoutForm((c) => ({ ...c, shippingMethod: "delivery", shippingZone: "gba", street: "", number: "", floor: "", apartment: "", city: "Buenos Aires", province: "Buenos Aires", postalCode: "", notes: "" })); setAddressValidationErrors([]); }}
                      >
                        <span className="shipping-card-icon">
                          <svg viewBox="0 0 24 24"><path d="M2 4h12v13H2z"/><path d="M14 9h4l3 3v5h-7"/><circle cx="6.5" cy="18.5" r="2"/><circle cx="18" cy="18.5" r="2"/></svg>
                        </span>
                        <span className="shipping-card-info">
                          <span className="shipping-card-label">Envío a GBA</span>
                          <span className="shipping-card-sub">1–3 días hábiles</span>
                        </span>
                        <span className={`shipping-card-price${hasReachedFreeShipping ? " shipping-card-free" : ""}`}>
                          {hasReachedFreeShipping ? "Gratis" : "$7.000"}
                        </span>
                        <span className="shipping-card-radio" />
                      </button>
                    </div>

                    <p className="checkout-details-help">
                      Seleccioná si preferís recibir el pedido a domicilio o retirarlo en nuestra tienda de Villa Crespo.
                    </p>

                    {checkoutForm.shippingMethod === "delivery" && (
                      <>
                        <label>
                          <span>País *</span>
                          <select
                            value={checkoutForm.country}
                            onChange={(event) => setCheckoutForm((current) => ({ ...current, country: event.target.value }))}
                          >
                            <option value="Argentina">Argentina</option>
                          </select>
                        </label>

                        <div className="checkout-details-grid two-columns">
                          <label className="checkout-address-field">
                            <span>Calle *</span>
                            <input
                              ref={addressInputRef}
                              type="text"
                              name="checkout-street-nofill"
                              value={checkoutForm.street}
                              onChange={(event) => {
                                const value = event.target.value;
                                setCheckoutForm((current) => ({ ...current, street: value }));
                                clearTimeout(addressDebounceRef.current);
                                addressDebounceRef.current = setTimeout(() => fetchAddressSuggestions(value), 300);
                              }}
                              onBlur={() => setTimeout(() => setAddressSuggestions([]), 150)}
                              placeholder="Ej: Av. Corrientes"
                              required
                              autoComplete="new-password"
                            />
                            {addressSuggestions.length > 0 && (
                              <ul className="checkout-address-suggestions">
                                {addressSuggestions.map((s) => (
                                  <li key={s.place_id} onMouseDown={() => handleAddressSuggestionSelect(s)}>
                                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={{flexShrink:0}}><path fill="#666" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7m0 9.5A2.5 2.5 0 0 1 9.5 9 2.5 2.5 0 0 1 12 6.5 2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5"/></svg>
                                    <span>{s.description}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </label>
                          <label>
                            <span>Número *</span>
                            <input
                              type="text"
                              value={checkoutForm.number}
                              onChange={(event) => setCheckoutForm((current) => ({ ...current, number: event.target.value }))}
                              placeholder="Ej: 5200"
                              required
                              autoComplete="new-password"
                            />
                          </label>
                        </div>

                        <div className="checkout-details-grid two-columns">
                          <label>
                            <span>Piso</span>
                            <input
                              type="text"
                              value={checkoutForm.floor}
                              onChange={(event) => setCheckoutForm((current) => ({ ...current, floor: event.target.value }))}
                              placeholder="Ej: 3"
                              autoComplete="new-password"
                            />
                          </label>
                          <label>
                            <span>Departamento</span>
                            <input
                              type="text"
                              value={checkoutForm.apartment}
                              onChange={(event) => setCheckoutForm((current) => ({ ...current, apartment: event.target.value }))}
                              placeholder="Ej: A"
                              autoComplete="new-password"
                            />
                          </label>
                        </div>

                        <div className="checkout-details-grid two-columns">
                          <label>
                            <span>Ciudad *</span>
                            <input
                              type="text"
                              value={checkoutForm.city}
                              onChange={(event) => {
                                const value = event.target.value;
                                setCheckoutForm((current) => ({
                                  ...current,
                                  city: value,
                                  shippingZone: detectShippingZone(value, current.province, current.postalCode),
                                }));
                              }}
                              required
                            />
                          </label>
                          <label>
                            <span>Provincia *</span>
                            <input
                              type="text"
                              value={checkoutForm.province}
                              onChange={(event) => {
                                const value = event.target.value;
                                setCheckoutForm((current) => ({
                                  ...current,
                                  province: value,
                                  shippingZone: detectShippingZone(current.city, value, current.postalCode),
                                }));
                              }}
                              required
                            />
                          </label>
                        </div>

                        <label>
                          <span>Código postal *</span>
                          <input
                            type="text"
                            value={checkoutForm.postalCode}
                            onChange={(event) => {
                              const value = event.target.value;
                              setCheckoutForm((current) => ({
                                ...current,
                                postalCode: value,
                                shippingZone: detectShippingZone(current.city, current.province, value),
                              }));
                            }}
                            placeholder="Ej: 1414"
                            required
                          />
                        </label>

                        <label>
                          <span>Referencia de entrega</span>
                          <input
                            type="text"
                            value={checkoutForm.notes}
                            onChange={(event) => setCheckoutForm((current) => ({ ...current, notes: event.target.value }))}
                            placeholder="Ej: Timbre 2B, portón negro"
                          />
                        </label>

                        <div className="checkout-shipping-zone-indicator">
                          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{flexShrink:0}}>
                            <path fill={checkoutForm.shippingZone === "caba" ? "#2563eb" : "#059669"} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7m0 9.5A2.5 2.5 0 0 1 9.5 9 2.5 2.5 0 0 1 12 6.5 2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5"/>
                          </svg>
                          <span>
                            Zona de envío: <strong>{checkoutForm.shippingZone === "caba" ? "CABA" : "GBA"}</strong>
                            {" — "}
                            {hasReachedFreeShipping
                              ? <strong style={{ color: '#059669' }}>Envío gratis</strong>
                              : <strong>${(checkoutForm.shippingZone === "caba" ? 5000 : 7000).toLocaleString("es-AR")} ARS</strong>
                            }
                          </span>
                        </div>

                        {addressValidationErrors.length > 0 && (
                          <ul className="checkout-address-errors">
                            {addressValidationErrors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}

                    <label>
                      <span>Tipo de consumidor *</span>
                      <select
                        value={checkoutForm.consumerType}
                        onChange={(event) => setCheckoutForm((current) => ({ ...current, consumerType: event.target.value }))}
                      >
                        <option value="consumidor-final">Consumidor Final</option>
                        <option value="responsable-inscripto">Responsable Inscripto</option>
                      </select>
                    </label>

                    <fieldset className="checkout-radio-group">
                      <legend>¿Necesitás Factura A?</legend>
                      <label>
                        <input
                          type="radio"
                          name="facturaA"
                          checked={checkoutForm.needsFacturaA === true}
                          onChange={() => setCheckoutForm((current) => ({ ...current, needsFacturaA: true }))}
                        />
                        Sí
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="facturaA"
                          checked={checkoutForm.needsFacturaA === false}
                          onChange={() => setCheckoutForm((current) => ({ ...current, needsFacturaA: false }))}
                        />
                        No
                      </label>
                    </fieldset>

                    {checkoutForm.shippingMethod === "pickup" && (
                      <fieldset className="checkout-radio-group checkout-payment-method-group">
                        <legend>Método de pago *</legend>
                        <label className={`checkout-payment-option${checkoutForm.paymentMethod === "mercadopago" ? " is-selected" : ""}`}>
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="mercadopago"
                            checked={checkoutForm.paymentMethod === "mercadopago"}
                            onChange={() => setCheckoutForm((current) => ({ ...current, paymentMethod: "mercadopago" }))}
                          />
                          <span className="checkout-payment-option-content">
                            <strong>Pagar con Mercado Pago</strong>
                            <span>Tarjeta, transferencia o efectivo en punto de pago</span>
                          </span>
                        </label>
                        <label className={`checkout-payment-option${checkoutForm.paymentMethod === "cash" ? " is-selected" : ""}`}>
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="cash"
                            checked={checkoutForm.paymentMethod === "cash"}
                            onChange={() => setCheckoutForm((current) => ({ ...current, paymentMethod: "cash" }))}
                          />
                          <span className="checkout-payment-option-content">
                            <strong>Pagar al retirar</strong>
                            <span>Aboná cuando retires tu pedido en el local</span>
                          </span>
                        </label>
                      </fieldset>
                    )}

                    {checkoutForm.shippingMethod === "delivery" && (
                      <label className="checkout-checkbox-row">
                        <input
                          type="checkbox"
                          checked={checkoutForm.saveAddress}
                          onChange={(event) => setCheckoutForm((current) => ({ ...current, saveAddress: event.target.checked }))}
                        />
                        Guardar esta dirección
                      </label>
                    )}

                    <div className="checkout-details-actions">
                      <button type="button" className="secondary-btn" onClick={() => setActiveSection("cart")}>Usar una dirección diferente</button>
                      <button type="submit" className="primary-btn" disabled={isCheckoutLoading}>
                        {isCheckoutLoading ? "Confirmando..." : "Continuar"}
                      </button>
                    </div>

                    {checkoutMessage && <p className="checkout-message">{checkoutMessage}</p>}
                  </form>
                </section>

                <aside className="checkout-details-summary" aria-label="Resumen del pedido">
                  <h2>Resumen del pedido ({totalItems} ítem{totalItems === 1 ? "" : "s"})</h2>

                  <ul className="checkout-details-summary-items">
                    {cart.map((item) => (
                      <li key={`summary-${item.cartKey || `${item.id}:base`}`}>
                        <div className="checkout-details-summary-item-main">
                          <img src={getProductImageUrl(item)} alt={getProductImageAlt(item, 0)} />
                          <span className="checkout-details-summary-qty">{item.quantity}</span>
                          <div>
                            <p>{item.name}</p>
                            {(item.variantPresentation || item.variantName) && (
                              <small>
                                {item.variantPresentation ? `${item.variantPresentation}: ` : ""}
                                {item.variantName}
                              </small>
                            )}
                          </div>
                        </div>
                        <strong>{(Number(item.price) * item.quantity).toLocaleString("es-AR")},00 ARS</strong>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className="checkout-details-promo"
                    onClick={() => setIsCheckoutPromoOpen((current) => !current)}
                  >
                    Ingresar código de promoción
                  </button>

                  {isCheckoutPromoOpen && (
                    <div className="cart-extra-panel checkout-details-promo-panel" aria-label="Código promocional en resumen">
                      <input
                        type="text"
                        placeholder="P. ej., OFERTA50"
                        value={cartPromoCode}
                        onChange={(event) => setCartPromoCode(event.target.value)}
                      />
                      <button
                        type="button"
                        className="cart-extra-apply-btn"
                        onClick={handleApplyCartPromotion}
                        disabled={isApplyingCartPromo}
                      >
                        {isApplyingCartPromo ? "Aplicando..." : "Aplicar"}
                      </button>
                    </div>
                  )}
                  {isCheckoutPromoOpen && cartPromoMessage && <p className="cart-promo-message">{cartPromoMessage}</p>}
                  {isCheckoutPromoOpen && appliedCartPromoPercent !== null && (
                    <p className="cart-promo-percent">Descuento aplicado: {appliedCartPromoPercent}%</p>
                  )}

                  <div className="checkout-details-totals">
                    <p><span>Subtotal</span><strong>{cartSubtotal.toLocaleString("es-AR")},00 ARS</strong></p>
                    {cartDiscount > 0 && <p><span>Descuento</span><strong>-{cartDiscount.toLocaleString("es-AR")} ARS</strong></p>}
                    {welcomeDiscountAmount > 0 && (
                      <p style={{ background: '#eff6ff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #1a4ac8', margin: '8px 0' }}>
                        <span style={{ color: '#1a4ac8', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <svg viewBox="0 0 64 64" style={{width: '15px', height: '15px', display:'block', flexShrink: 0}}>
                            <path fill="#1877f2" d="M51.429 15.856c4.558-4.299-.715-9.875-10.687-6.421c-.587.204-1.133.419-1.648.642c.977-1.876 2.42-3.924 4.58-5.885c0 0-4.034 1.449-5.898 1.082C35.464 4.819 34.739 2 34.739 2s-2.405 5.238-3.63 9.349c-1.754-3.532-3.697-6.969-3.697-6.969s-1.037 2.404-2.936 3.318c-1.531.74-7.829 1.378-7.829 1.378c2.1 1.074 3.903 2.401 5.433 3.774c-1.609-.426-3.446-.746-5.547-.898c-8.344-.605-11.621 2.372-10.505 5.313L2 17.394l2.192 8.219L5.554 26c3.232 10.949 2.45 23.098 2.44 23.235l-.055.792l.754.222C20.766 53.805 31.735 62 31.735 62s14.222-9.412 22.042-11.753l.684-.205l.014-.72c.004-.17.346-15.334 4.271-25.218c.276-.039.536-.07.759-.084l.827-.05l.083-.832c.003-.033.341-4.796 1.586-6.739zM4.587 19.7l6.483 1.759v4.063l-5.381-1.528zm10.074 30.512a70 70 0 0 0-4.681-1.63c.128-2.822.313-12.549-2.233-21.96l4.71 1.338c.912 4.023 2.426 12.311 2.204 22.252m7.893-35.169c8.094.586 9.517 4.764 9.517 4.764s-4.931 1.803-7.978 1.803c-9.942 0-11.378-7.28-1.539-6.567m9.988 5.379l8.126.921l-10.13 2.451l-5.786-1.293zm-9.729 3.661l6.76 1.51v5.184l-6.979-1.947zm8.041 34.937c-1.476-1.096-3.936-2.787-7.202-4.6c.259-4.777.29-17.541.291-23.198l6.911 1.963zm9.046-4.356a138 138 0 0 0-7.1 4.496V32.29a511 511 0 0 1 8.162-2.917c-.587 5.658-.954 20.424-1.062 25.291m3.28-27.832s-9.738 3.125-11.659 3.834V25.58l11.811-2.858zm-1.2-7.461c-4.559 1.168-9.408.344-9.408.344s-.909-4.465 6.451-7.014c8.946-3.099 12.483 4.229 2.957 6.67m6.711-1.699l5.796.326l-3.481.843l-4.157-.41c.673-.234 1.284-.49 1.842-.759m3.856 30.9c-1.447.473-2.973 1.092-4.511 1.793c.011-4.684.297-15.066 2.467-24.145c2.231-.688 4.299-1.275 5.987-1.672c-3.227 8.986-3.838 20.96-3.943 24.024m6.038-26.431s-3.201.938-5.245 1.502l.514-3.468l5.565-1.346c-.456 1.255-.834 3.312-.834 3.312"/>
                          </svg>
                          <span style={{flex: 1}}>Descuento Bienvenida (10%)
                          <br />
                          <span style={{ fontSize: '11px', fontWeight: 400 }}>
                            Expira en: <WelcomeDiscountTimer expiresAt={auth.user?.welcomeDiscountExpiresAt} compact />
                          </span>
                          </span>
                        </span>
                        <strong style={{ color: '#059669' }}>-{welcomeDiscountAmount.toLocaleString("es-AR")} ARS</strong>
                      </p>
                    )}
                    <p><span>Entrega/envío</span><strong style={hasReachedFreeShipping ? { color: '#059669' } : {}}>{hasReachedFreeShipping ? 'Gratis' : `${checkoutShippingCost.toLocaleString("es-AR")},00 ARS`}</strong></p>
                    <p className="is-total"><span>Total</span><strong>{checkoutTotal.toLocaleString("es-AR")},00 ARS</strong></p>
                  </div>
                </aside>
              </div>
            </section>
          ) : activeSection === "favorites" ? (
            <section className="favorites-view" aria-label="Productos favoritos">
              <h1>Mis favoritos</h1>
              <p className="subtitle">Tus productos guardados para volver a comprarlos cuando quieras.</p>

              {favoriteProducts.length ? (
                <section className="products-grid" aria-label="Productos favoritos guardados">
                  {favoriteProducts.map((product) => {
                    const selectedQuantity = getCatalogQuantity(product.id);
                    const stockLimit = getStockLimit(product.stock);
                    const isQtyAtStockLimit = stockLimit !== null && selectedQuantity >= stockLimit;
                    const { primaryImageUrl, secondaryImageUrl, primaryImageAlt, secondaryImageAlt } = getCardImagePair(product);

                    return (
                      <article
                        key={product.id}
                        className="product-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => openProductPreview(product)}
                        onKeyDown={(event) => {
                          if (event.target !== event.currentTarget) {
                            return;
                          }

                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openProductPreview(product);
                          }
                        }}
                      >
                        <button
                          type="button"
                          className={`favorite-btn card-favorite-btn ${isProductFavorite(product.id) ? "is-active" : ""}`}
                          onClick={(event) => handleToggleFavorite(product, event)}
                          data-tooltip={isProductFavorite(product.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                          aria-label={isProductFavorite(product.id) ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}
                        >
                          <span aria-hidden="true">★</span>
                        </button>

                        <figure className={`product-image-stack${secondaryImageUrl ? " has-hover-image" : ""}`}>
                          <img
                            className="product-image product-image-primary"
                            src={primaryImageUrl}
                            alt={primaryImageAlt}
                          />
                          {secondaryImageUrl && (
                            <img
                              className="product-image product-image-secondary"
                              src={secondaryImageUrl}
                              alt={secondaryImageAlt}
                            />
                          )}
                        </figure>

                        <div className="product-card-content">
                          {product.brand && <p className="product-brand">{product.brand}</p>}
                          <h2 className="product-title">{product.name}</h2>
                          <p className="product-price">${Number(product.price).toLocaleString("es-AR")} ARS</p>

                          <div className="product-qty" aria-label={`Cantidad para ${product.name}`}>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                updateCatalogQuantity(product.id, -1);
                              }}
                              aria-label={`Quitar una unidad de ${product.name}`}
                            >
                              -
                            </button>
                            <span>{selectedQuantity}</span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                updateCatalogQuantity(product.id, 1, stockLimit ?? 99);
                              }}
                              disabled={isQtyAtStockLimit}
                              data-tooltip={isQtyAtStockLimit ? "Stock maximo alcanzado" : undefined}
                              aria-label={`Agregar una unidad de ${product.name}`}
                            >
                              +
                            </button>
                          </div>

                          {isQtyAtStockLimit && catalogQuantities[product.id] !== undefined && <p className="product-stock-limit-note">Stock maximo alcanzado</p>}

                          <button
                            type="button"
                            className="product-add-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              addToCart(product, selectedQuantity);
                            }}
                          >
                            <span className="product-add-icon" aria-hidden="true">
                              <svg viewBox="0 0 50 50" style={{width: '1.1em', height: '1.1em', display: 'inline-block', verticalAlign: 'middle'}}>
                                <path fill="currentColor" d="M35 34H13c-.3 0-.6-.2-.8-.4s-.2-.6-.1-.9l1.9-4.8L12.1 10H6V8h7c.5 0 .9.4 1 .9l2 19c0 .2 0 .3-.1.5L14.5 32H36z"/>
                                <path fill="currentColor" d="m15.2 29l-.4-2L38 22.2V14H14v-2h25c.6 0 1 .4 1 1v10c0 .5-.3.9-.8 1zM36 40c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-24 6c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
                              </svg>
                            </span>
                            <span>Agregar al carrito</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>
              ) : (
                <p className="empty-results">Todavía no agregaste productos a favoritos.</p>
              )}
            </section>
          ) : activeSection === "account" ? (
            <AccountPanel
              user={auth.user}
              initialTab={accountInitialTab}
              isAdmin={isAdmin}
              totalItems={totalItems}
              cartSubtotal={cartSubtotal}
              orders={orders}
              myOrders={myOrders}
              isMyOrdersLoading={isMyOrdersLoading}
              tickets={tickets}
              ticketMetrics={ticketMetrics}
              isTicketsLoading={isTicketsLoading}
              lowStockAlerts={lowStockAlerts}
              onGoHome={() => setActiveSection("home")}
              onGoCart={() => setActiveSection("cart")}
              onGoAdmin={handleGoAdminSection}
              onCreateTicket={handleCreateTicket}
              onAddTicketComment={handleAddTicketComment}
              onReloadTickets={handleReloadTickets}
              onSaveProfile={handleSaveProfile}
              onSaveAddress={handleSaveAddress}
              onRepeatOrder={handleRepeatOrder}
            />
          ) : activeSection === "product" && selectedProduct ? (
            <section className="product-detail-view" aria-label="Detalle de producto">
              <button type="button" className="product-detail-back" onClick={goBackFromProduct}>
                ← Volver al catálogo
              </button>

              <div className="product-detail-grid">
                <div className="product-gallery-wrap">
                  <div className="product-gallery-thumbs" aria-label="Miniaturas del producto">
                    {selectedProductImages.map((imageUrl, index) => (
                      <button
                        type="button"
                        key={`${selectedProduct.id}-thumb-${index}`}
                        className={`product-gallery-thumb ${index === selectedProductImageIndex ? "is-active" : ""}`}
                        onClick={() => setSelectedProductImageIndex(index)}
                        aria-label={`Ver foto ${index + 1} de ${selectedProduct.name}`}
                      >
                        <img src={imageUrl} alt={getProductImageAlt(selectedProduct, index)} />
                      </button>
                    ))}
                  </div>

                  <div className="product-gallery-main">
                    <img
                      src={selectedProductImages[selectedProductImageIndex] || selectedProductImages[0]}
                      alt={getProductImageAlt(selectedProduct, selectedProductImageIndex)}
                    />
                  </div>
                </div>

                <div className="product-detail-content">
                  <div className="product-detail-title-row">
                    <h1>{selectedProduct.name}</h1>
                    <button
                      type="button"
                      className={`favorite-btn detail-favorite-btn ${isProductFavorite(selectedProduct.id) ? "is-active" : ""}`}
                      onClick={(event) => handleToggleFavorite(selectedProduct, event)}
                      data-tooltip={isProductFavorite(selectedProduct.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                      aria-label={isProductFavorite(selectedProduct.id)
                        ? `Quitar ${selectedProduct.name} de favoritos`
                        : `Agregar ${selectedProduct.name} a favoritos`}
                    >
                      <span aria-hidden="true">★</span>
                    </button>
                  </div>
                  <p className="product-detail-price">${Number(selectedProductEffectivePrice).toLocaleString("es-AR")} ARS</p>

                  {selectedProductVariants.length > 0 && (
                    <div className="product-detail-options">
                      <h2>{selectedProductVariants[0]?.presentation || "Opciones disponibles"}</h2>
                      <div className="product-detail-options-list">
                        {selectedProductVariants.map((variant) => (
                          <button
                            key={variant.id}
                            type="button"
                            className={`product-detail-option-btn ${selectedProductVariant?.id === variant.id ? "is-active" : ""}`}
                            onClick={() =>
                              setSelectedVariantByProduct((current) => ({
                                ...current,
                                [selectedProduct.id]: variant.id
                              }))
                            }
                          >
                            <span>{variant.name}</span>
                          </button>
                        ))}
                      </div>
                      {selectedProductVariant && (
                        <p className="product-detail-option-note">
                          {selectedProductVariant.presentation || "Opción"}: {selectedProductVariant.name}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="product-detail-short">
                    <h2>Lo que tenés que saber de este producto</h2>
                    <p>{selectedProduct.shortDescription || "Sin descripción corta disponible."}</p>
                  </div>

                  <div className="product-detail-purchase-block">
                    <label htmlFor="product-detail-qty">Cantidad</label>
                    <div id="product-detail-qty" className="product-qty" aria-label={`Cantidad para ${selectedProduct.name}`}>
                      <button
                        type="button"
                        onClick={() => updateCatalogQuantity(selectedProduct.id, -1)}
                        aria-label={`Quitar una unidad de ${selectedProduct.name}`}
                      >
                        -
                      </button>
                      <span>{getCatalogQuantity(selectedProduct.id)}</span>
                      <button
                        type="button"
                        onClick={() => updateCatalogQuantity(selectedProduct.id, 1, selectedProductEffectiveStock)}
                        disabled={
                          Number.isFinite(Number(selectedProductEffectiveStock))
                          && getCatalogQuantity(selectedProduct.id) >= Math.max(0, Number(selectedProductEffectiveStock))
                        }
                        aria-label={`Agregar una unidad de ${selectedProduct.name}`}
                      >
                        +
                      </button>
                    </div>
                    <p className="product-detail-stock">
                      {Number.isFinite(Number(selectedProductEffectiveStock))
                        ? `Solo ${Math.max(0, Number(selectedProductEffectiveStock))} disponible(s)`
                        : "Stock sujeto a disponibilidad"}
                    </p>

                    <button
                      type="button"
                      className="product-add-btn"
                      onClick={handleAddSelectedProductToCart}
                      disabled={Number.isFinite(Number(selectedProductEffectiveStock)) && Number(selectedProductEffectiveStock) <= 0}
                    >
                      <span className="product-add-icon" aria-hidden="true">
                        <svg viewBox="0 0 50 50" style={{width: '1.1em', height: '1.1em', display: 'inline-block', verticalAlign: 'middle'}}>
                          <path fill="currentColor" d="M35 34H13c-.3 0-.6-.2-.8-.4s-.2-.6-.1-.9l1.9-4.8L12.1 10H6V8h7c.5 0 .9.4 1 .9l2 19c0 .2 0 .3-.1.5L14.5 32H36z"/>
                          <path fill="currentColor" d="m15.2 29l-.4-2L38 22.2V14H14v-2h25c.6 0 1 .4 1 1v10c0 .5-.3.9-.8 1zM36 40c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-24 6c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
                        </svg>
                      </span>
                      <span>Agregar al carrito</span>
                    </button>

                    <button
                      type="button"
                      className="product-buy-btn"
                      onClick={handleBuyNowSelectedProduct}
                      disabled={Number.isFinite(Number(selectedProductEffectiveStock)) && Number(selectedProductEffectiveStock) <= 0}
                    >
                      <span className="product-buy-icon" aria-hidden="true">💳</span>
                      <span>Realizar compra</span>
                    </button>
                  </div>

                  <div className="product-benefits">
                    <h3>¡Comprá Mejor con Estos Beneficios!</h3>
                    <ul>
                      <li>✔ Envío gratis en CABA y Gran Buenos Aires a partir de $50.000 ARS</li>
                      <li>✔ Comprá hoy y recibilo mañana*</li>
                      <li>✔ Promociones semanales exclusivas para miembros</li>
                    </ul>
                    <p style={{ fontSize: "0.78rem", color: "rgba(45,45,45,0.55)", margin: "0" }}>
                      * Válido para compras realizadas de lunes a viernes. Entregas en CABA y Gran Buenos Aires.
                    </p>
                    {!auth.user && (
                      <p>
                        🏷️ Hacete miembro de La Boutique de la Limpieza -{" "}
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); openLoginModal("register"); }}
                        >
                          Clic aquí
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="product-info-accordion">
                    <button type="button" onClick={() => handleToggleInfoSection("description")}>
                      <span>Descripción del producto</span>
                      <span>{openInfoSection === "description" ? "−" : "+"}</span>
                    </button>
                    {openInfoSection === "description" && (
                      <div className="product-info-panel">
                        <p>{selectedProduct.longDescription || "Sin descripción larga disponible."}</p>
                      </div>
                    )}

                    <button type="button" onClick={() => handleToggleInfoSection("shipping")}>
                      <span>Políticas de envío</span>
                      <span>{openInfoSection === "shipping" ? "−" : "+"}</span>
                    </button>
                    {openInfoSection === "shipping" && (
                      <div className="product-info-panel">
                        <p>Realizamos envíos a todo el país. Los tiempos pueden variar según zona y demanda.</p>
                      </div>
                    )}

                    <button type="button" onClick={() => handleToggleInfoSection("returns")}>
                      <span>Políticas de cambios y devoluciones</span>
                      <span>{openInfoSection === "returns" ? "−" : "+"}</span>
                    </button>
                    {openInfoSection === "returns" && (
                      <div className="product-info-panel">
                        <p>Podés solicitar cambios o devoluciones dentro de los plazos vigentes, con el producto en buen estado.</p>
                      </div>
                    )}

                    <button type="button" onClick={() => handleToggleInfoSection("terms")}>
                      <span>Términos y condiciones</span>
                      <span>{openInfoSection === "terms" ? "−" : "+"}</span>
                    </button>
                    {openInfoSection === "terms" && (
                      <div className="product-info-panel">
                        <p>La compra implica la aceptación de los términos y condiciones de uso y venta del sitio.</p>
                      </div>
                    )}

                    <button type="button" onClick={() => handleToggleInfoSection("privacy")}>
                      <span>Políticas de privacidad</span>
                      <span>{openInfoSection === "privacy" ? "−" : "+"}</span>
                    </button>
                    {openInfoSection === "privacy" && (
                      <div className="product-info-panel">
                        <p>Protegemos tus datos y los usamos únicamente para gestionar tus compras y mejorar el servicio.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <section className="products-carousel product-related" aria-label="Productos similares">
                <div className="product-related-title-wrap">
                  <h2>Productos similares</h2>
                </div>

                {relatedProducts.length ? (
                  <>
                    <button
                      type="button"
                      className="carousel-arrow carousel-arrow-left"
                      onClick={() => scrollProductsRow("left", similarProductsRowRef)}
                      aria-label="Ver productos similares anteriores"
                    >
                      <span className="nav-arrow-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <path d="M7 10.5 12 15.5 17 10.5" />
                        </svg>
                      </span>
                    </button>

                    <div className="products-row" ref={similarProductsRowRef}>
                      {relatedProducts.map((product) => {
                        const selectedQuantity = getCatalogQuantity(product.id);
                        const stockLimit = getStockLimit(product.stock);
                        const isQtyAtStockLimit = stockLimit !== null && selectedQuantity >= stockLimit;
                        const { primaryImageUrl, secondaryImageUrl, primaryImageAlt, secondaryImageAlt } = getCardImagePair(product);

                        return (
                          <article
                            key={product.id}
                            className="product-card"
                            role="button"
                            tabIndex={0}
                            onClick={() => openProductPreview(product)}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) {
                                return;
                              }

                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openProductPreview(product);
                              }
                            }}
                          >
                            <button
                              type="button"
                              className={`favorite-btn card-favorite-btn ${isProductFavorite(product.id) ? "is-active" : ""}`}
                              onClick={(event) => handleToggleFavorite(product, event)}
                              data-tooltip={isProductFavorite(product.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                              aria-label={isProductFavorite(product.id) ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}
                            >
                              <span aria-hidden="true">★</span>
                            </button>

                            <figure className={`product-image-stack${secondaryImageUrl ? " has-hover-image" : ""}`}>
                              <img
                                className="product-image product-image-primary"
                                src={primaryImageUrl}
                                alt={primaryImageAlt}
                              />
                              {secondaryImageUrl && (
                                <img
                                  className="product-image product-image-secondary"
                                  src={secondaryImageUrl}
                                  alt={secondaryImageAlt}
                                />
                              )}
                            </figure>

                            <div className="product-card-content">
                              {product.brand && <p className="product-brand">{product.brand}</p>}
                              <h3 className="product-title">{product.name}</h3>
                              <p className="product-price">${Number(product.price).toLocaleString("es-AR")} ARS</p>

                              <div className="product-qty" aria-label={`Cantidad para ${product.name}`}>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    updateCatalogQuantity(product.id, -1);
                                  }}
                                  aria-label={`Quitar una unidad de ${product.name}`}
                                >
                                  -
                                </button>
                                <span>{selectedQuantity}</span>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    updateCatalogQuantity(product.id, 1, stockLimit ?? 99);
                                  }}
                                  disabled={isQtyAtStockLimit}
                                  data-tooltip={isQtyAtStockLimit ? "Stock maximo alcanzado" : undefined}
                                  aria-label={`Agregar una unidad de ${product.name}`}
                                >
                                  +
                                </button>
                              </div>

                              {isQtyAtStockLimit && catalogQuantities[product.id] !== undefined && <p className="product-stock-limit-note">Stock maximo alcanzado</p>}

                              <button
                                type="button"
                                className="product-add-btn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  addToCart(product, selectedQuantity);
                                }}
                              >
                                <span className="product-add-icon" aria-hidden="true">
                                  <svg viewBox="0 0 50 50" style={{width: '1.1em', height: '1.1em', display: 'inline-block', verticalAlign: 'middle'}}>
                                    <path fill="currentColor" d="M35 34H13c-.3 0-.6-.2-.8-.4s-.2-.6-.1-.9l1.9-4.8L12.1 10H6V8h7c.5 0 .9.4 1 .9l2 19c0 .2 0 .3-.1.5L14.5 32H36z"/>
                                    <path fill="currentColor" d="m15.2 29l-.4-2L38 22.2V14H14v-2h25c.6 0 1 .4 1 1v10c0 .5-.3.9-.8 1zM36 40c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-24 6c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
                                  </svg>
                                </span>
                                <span>Agregar al carrito</span>
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      className="carousel-arrow carousel-arrow-right"
                      onClick={() => scrollProductsRow("right", similarProductsRowRef)}
                      aria-label="Ver más productos similares"
                    >
                      <span className="nav-arrow-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <path d="M7 10.5 12 15.5 17 10.5" />
                        </svg>
                      </span>
                    </button>
                  </>
                ) : (
                  <p className="empty-results">No hay productos similares por el momento.</p>
                )}
              </section>
            </section>
          ) : (
            <>
              {isInicioActive && (
                <HomeBanners
                  onExploreProducts={() => {
                    const catalogAnchor = document.getElementById("home-catalog-start");
                    catalogAnchor?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  onViewPromotions={handleGoPromotionsSection}
                />
              )}

              {isInicioActive && <BrandsCarousel onSelectBrand={handleSelectBrandFromCarousel} />}

              {isInicioActive && !auth.user?.welcomeDiscountUsed && (
                <WelcomePromoSpotlight
                  onActivate={handleActivateWelcomePromo}
                  isActive={auth.user?.welcomeDiscountActive || false}
                />
              )}

              <div id="home-catalog-start" />
              {!isInicioActive && <h1>{catalogHeading}</h1>}
              <p className={`subtitle${isInicioActive ? " home-catalog-subtitle" : ""}`}>
                {isInicioActive ? "Nuestro catálogo" : catalogSubtitle}
              </p>
              {isInicioActive && (
                <p className="home-catalog-description">Explorá todas las marcas y productos de limpieza para tu hogar o negocio.</p>
              )}
              {!isInicioActive && (
                <section className={`catalog-seo-copy${seoExpanded ? " catalog-seo-copy--open" : ""}`} aria-label="Información de catálogo">
                  <button
                    type="button"
                    className="catalog-seo-toggle"
                    onClick={() => setSeoExpanded(prev => !prev)}
                    aria-expanded={seoExpanded}
                  >
                    <span>Más sobre esta categoría</span>
                    <svg className="catalog-seo-toggle-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {seoExpanded && (
                    <div className="catalog-seo-body">
                      <p className="catalog-seo-copy-text">{catalogSeoSummary}</p>
                      {topCatalogCategories.length > 0 && (
                        <div className="catalog-seo-links" aria-label="Categorías destacadas">
                          {topCatalogCategories.map((category) => (
                            <button
                              type="button"
                              key={`catalog-seo-category-${category.name}`}
                              className="catalog-seo-link"
                              onClick={() => handleSelectCategory(category.name)}
                            >
                              {category.name} ({category.count})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}
              {productsLoadError && (
                <p className="catalog-load-error" role="alert">
                  {productsLoadError}
                </p>
              )}
              {isSearchActive && suggestedSearchCorrection && (
                <p className="search-spell-suggestion">
                  Quizá quisiste decir{" "}
                  <button
                    type="button"
                    className="search-spell-suggestion-btn"
                    onClick={handleApplySuggestedSearch}
                    aria-label={`Buscar ${suggestedSearchCorrection}`}
                  >
                    "{suggestedSearchCorrection}"
                  </button>
                  .
                </p>
              )}

              {shouldRenderGridProducts && (
                <div className="results-filter-toolbar" aria-label="Controles de resultados">
                  <p className="results-filter-count">{sortedFilteredProducts.length} resultados</p>
                  <div className="results-filter-wrap">
                    <button
                      type="button"
                      className={`results-filter-btn${isResultsFilterOpen ? " is-open" : ""}`}
                      onClick={() => setIsResultsFilterOpen((current) => !current)}
                      aria-haspopup="true"
                      aria-expanded={isResultsFilterOpen}
                    >
                      {activeResultsSortIcon}
                      Filtro: {activeResultsSortLabel}
                    </button>

                    {isResultsFilterOpen && (
                      <div className="results-filter-panel" role="menu" aria-label="Opciones de filtro">
                        {RESULTS_SORT_OPTIONS.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            role="menuitemradio"
                            aria-checked={resultsSortKey === option.key}
                            className={`results-filter-option${resultsSortKey === option.key ? " is-active" : ""}`}
                            onClick={() => {
                              setResultsSortKey(option.key);
                              setIsResultsFilterOpen(false);
                            }}
                          >
                            {option.icon}
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {hasCatalogProductsToRender ? (
                shouldRenderGridProducts ? (
                  <>
                    <section className="products-grid" aria-label={isSpecificCategorySelected ? `Productos de ${selectedCategory}` : "Resultados de búsqueda"}>
                      {visibleGridProducts.map((product) => {
                        const selectedQuantity = getCatalogQuantity(product.id);
                        const stockLimit = getStockLimit(product.stock);
                        const isQtyAtStockLimit = stockLimit !== null && selectedQuantity >= stockLimit;
                        const { primaryImageUrl, secondaryImageUrl, primaryImageAlt, secondaryImageAlt } = getCardImagePair(product);

                        return (
                          <article
                            key={product.id}
                            className="product-card"
                            role="button"
                            tabIndex={0}
                            onClick={() => openProductPreview(product)}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) {
                                return;
                              }

                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openProductPreview(product);
                              }
                            }}
                          >
                            <button
                              type="button"
                              className={`favorite-btn card-favorite-btn ${isProductFavorite(product.id) ? "is-active" : ""}`}
                              onClick={(event) => handleToggleFavorite(product, event)}
                              aria-label={isProductFavorite(product.id) ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}
                            >
                              <span aria-hidden="true">★</span>
                            </button>

                            <figure className={`product-image-stack${secondaryImageUrl ? " has-hover-image" : ""}`}>
                              <img
                                className="product-image product-image-primary"
                                src={primaryImageUrl}
                                alt={primaryImageAlt}
                              />
                              {secondaryImageUrl && (
                                <img
                                  className="product-image product-image-secondary"
                                  src={secondaryImageUrl}
                                  alt={secondaryImageAlt}
                                />
                              )}
                            </figure>

                            <div className="product-card-content">
                              {product.brand && <p className="product-brand">{product.brand}</p>}
                              <h2 className="product-title">{product.name}</h2>
                              <p className="product-price">${Number(product.price).toLocaleString("es-AR")} ARS</p>

                              <div className="product-qty" aria-label={`Cantidad para ${product.name}`}>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    updateCatalogQuantity(product.id, -1);
                                  }}
                                  aria-label={`Quitar una unidad de ${product.name}`}
                                >
                                  -
                                </button>
                                <span>{selectedQuantity}</span>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    updateCatalogQuantity(product.id, 1, stockLimit ?? 99);
                                  }}
                                  disabled={isQtyAtStockLimit}
                                  data-tooltip={isQtyAtStockLimit ? "Stock maximo alcanzado" : undefined}
                                  aria-label={`Agregar una unidad de ${product.name}`}
                                >
                                  +
                                </button>
                              </div>

                              {isQtyAtStockLimit && catalogQuantities[product.id] !== undefined && <p className="product-stock-limit-note">Stock maximo alcanzado</p>}

                              <button
                                type="button"
                                className="product-add-btn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  addToCart(product, selectedQuantity);
                                }}
                              >
                                <span className="product-add-icon" aria-hidden="true">
                                  <svg viewBox="0 0 50 50" style={{width: '1.1em', height: '1.1em', display: 'inline-block', verticalAlign: 'middle'}}>
                                    <path fill="currentColor" d="M35 34H13c-.3 0-.6-.2-.8-.4s-.2-.6-.1-.9l1.9-4.8L12.1 10H6V8h7c.5 0 .9.4 1 .9l2 19c0 .2 0 .3-.1.5L14.5 32H36z"/>
                                    <path fill="currentColor" d="m15.2 29l-.4-2L38 22.2V14H14v-2h25c.6 0 1 .4 1 1v10c0 .5-.3.9-.8 1zM36 40c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-24 6c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
                                  </svg>
                                </span>
                                <span>Agregar al carrito</span>
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </section>

                    {canLoadMoreCategoryProducts && (
                      <div className="category-load-more-wrap">
                        <button
                          type="button"
                          className="category-load-more-btn"
                          onClick={() => setCategoryVisibleCount((current) => current + CATEGORY_PAGE_SIZE)}
                        >
                          Cargar más
                        </button>
                      </div>
                    )}
                    {canLoadMoreSearchProducts && (
                      <div className="category-load-more-wrap">
                        <button
                          type="button"
                          className="category-load-more-btn"
                          onClick={() => setSearchVisibleCount((current) => current + SEARCH_PAGE_SIZE)}
                        >
                          Cargar más
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <section className={`products-carousel${isInicioActive ? " home-products-carousel" : ""}`} aria-label="Productos">
                    <button
                      type="button"
                      className="carousel-arrow carousel-arrow-left"
                      onClick={() => scrollProductsRow("left")}
                      aria-label="Ver productos anteriores"
                    >
                      <span className="nav-arrow-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <path d="M7 10.5 12 15.5 17 10.5" />
                        </svg>
                      </span>
                    </button>

                    <div className="products-row" ref={productsRowRef} onTouchStart={handleMobileSwipeStart} onTouchEnd={handleMobileSwipeEnd}>
                      {productsForCarousel.map((product, productIndex) => {
                      const selectedQuantity = getCatalogQuantity(product.id);
                      const stockLimit = getStockLimit(product.stock);
                      const isQtyAtStockLimit = stockLimit !== null && selectedQuantity >= stockLimit;
                      const { primaryImageUrl, secondaryImageUrl, primaryImageAlt, secondaryImageAlt } = getCardImagePair(product);
                      const isInMobilePage = productIndex >= mobileCarouselStart && productIndex < mobileCarouselStart + MOBILE_CAROUSEL_PAGE_SIZE;
                      const mobileCardIndex = productIndex - mobileCarouselStart;

                      return (
                        <article
                          key={isInMobilePage ? `${product.id}-anim-${mobileCarouselAnimKey}` : product.id}
                          className={`product-card${isInMobilePage ? "" : " mobile-carousel-hidden"}`}
                          style={isInMobilePage ? { animationDelay: `${mobileCardIndex * 0.08}s` } : undefined}
                          role="button"
                          tabIndex={0}
                          onClick={() => openProductPreview(product)}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) {
                              return;
                            }

                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openProductPreview(product);
                            }
                          }}
                        >
                          <button
                            type="button"
                            className={`favorite-btn card-favorite-btn ${isProductFavorite(product.id) ? "is-active" : ""}`}
                            onClick={(event) => handleToggleFavorite(product, event)}
                            data-tooltip={isProductFavorite(product.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                            aria-label={isProductFavorite(product.id) ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}
                          >
                            <span aria-hidden="true">★</span>
                          </button>

                          <figure className={`product-image-stack${secondaryImageUrl ? " has-hover-image" : ""}`}>
                            <img
                              className="product-image product-image-primary"
                              src={primaryImageUrl}
                              alt={primaryImageAlt}
                            />
                            {secondaryImageUrl && (
                              <img
                                className="product-image product-image-secondary"
                                src={secondaryImageUrl}
                                alt={secondaryImageAlt}
                              />
                            )}
                          </figure>

                          <div className="product-card-content">
                            {product.brand && <p className="product-brand">{product.brand}</p>}
                            <h2 className="product-title">{product.name}</h2>
                            <p className="product-price">${Number(product.price).toLocaleString("es-AR")} ARS</p>

                            <div className="product-qty" aria-label={`Cantidad para ${product.name}`}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateCatalogQuantity(product.id, -1);
                                }}
                                aria-label={`Quitar una unidad de ${product.name}`}
                              >
                                -
                              </button>
                              <span>{selectedQuantity}</span>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateCatalogQuantity(product.id, 1, stockLimit ?? 99);
                                }}
                                disabled={isQtyAtStockLimit}
                                data-tooltip={isQtyAtStockLimit ? "Stock maximo alcanzado" : undefined}
                                aria-label={`Agregar una unidad de ${product.name}`}
                              >
                                +
                              </button>
                            </div>

                            {isQtyAtStockLimit && catalogQuantities[product.id] !== undefined && <p className="product-stock-limit-note">Stock maximo alcanzado</p>}

                            <button
                              type="button"
                              className="product-add-btn"
                              onClick={(event) => {
                                event.stopPropagation();
                                addToCart(product, selectedQuantity);
                              }}
                            >
                              <span className="product-add-icon" aria-hidden="true">
                                <svg viewBox="0 0 50 50" style={{width: '1.1em', height: '1.1em', display: 'inline-block', verticalAlign: 'middle'}}>
                                  <path fill="currentColor" d="M35 34H13c-.3 0-.6-.2-.8-.4s-.2-.6-.1-.9l1.9-4.8L12.1 10H6V8h7c.5 0 .9.4 1 .9l2 19c0 .2 0 .3-.1.5L14.5 32H36z"/>
                                  <path fill="currentColor" d="m15.2 29l-.4-2L38 22.2V14H14v-2h25c.6 0 1 .4 1 1v10c0 .5-.3.9-.8 1zM36 40c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-24 6c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
                                </svg>
                              </span>
                              <span>Agregar al carrito</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                    </div>

                    <button
                      type="button"
                      className="carousel-arrow carousel-arrow-right"
                      onClick={() => scrollProductsRow("right")}
                      aria-label="Ver más productos"
                    >
                      <span className="nav-arrow-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <path d="M7 10.5 12 15.5 17 10.5" />
                        </svg>
                      </span>
                    </button>

                    <div className="products-carousel-mobile-arrows">
                      <button
                        type="button"
                        className="carousel-arrow carousel-arrow-left"
                        onClick={() => { setMobileCarouselPage((p) => Math.max(0, p - 1)); setMobileCarouselAnimKey((k) => k + 1); }}
                        disabled={safeMobileCarouselPage === 0}
                        aria-label="Ver productos anteriores"
                      >
                        <span className="nav-arrow-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                            <path d="M7 10.5 12 15.5 17 10.5" />
                          </svg>
                        </span>
                      </button>
                      <span className="mobile-carousel-page-indicator">
                        {safeMobileCarouselPage + 1} / {mobileCarouselTotalPages}
                      </span>
                      <button
                        type="button"
                        className="carousel-arrow carousel-arrow-right"
                        onClick={() => { setMobileCarouselPage((p) => Math.min(mobileCarouselTotalPages - 1, p + 1)); setMobileCarouselAnimKey((k) => k + 1); }}
                        disabled={safeMobileCarouselPage >= mobileCarouselTotalPages - 1}
                        aria-label="Ver más productos"
                      >
                        <span className="nav-arrow-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                            <path d="M7 10.5 12 15.5 17 10.5" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </section>
                )
              ) : (
                <p className="empty-results">
                  {isSpecificCategorySelected
                    ? `No hay productos para la categoría "${selectedCategory}" con esa búsqueda.`
                    : "No hay productos para esa búsqueda."}
                </p>
              )}

              {isInicioActive && (
                <DeliveryCoverageSection />
              )}

              {isInicioActive && (
                <section className="saphirus-gallery" aria-label="Productos Saphirus">
                  <header className="saphirus-gallery-header">
                    <h2>Productos Saphirus</h2>
                    <p>Explorá la galería de artículos Saphirus disponibles para sumar a tu pedido.</p>
                  </header>

                  {saphirusGalleryProducts.length ? (
                    <section className="products-carousel saphirus-products-carousel" aria-label="Galería de productos Saphirus">
                      <button
                        type="button"
                        className="carousel-arrow carousel-arrow-left"
                        onClick={() => scrollProductsRow("left", saphirusProductsRowRef)}
                        aria-label="Ver productos Saphirus anteriores"
                      >
                        <span className="nav-arrow-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                            <path d="M7 10.5 12 15.5 17 10.5" />
                          </svg>
                        </span>
                      </button>

                      <div className="products-row saphirus-products-row" ref={saphirusProductsRowRef} onTouchStart={handleSaphirusMobileSwipeStart} onTouchEnd={handleSaphirusMobileSwipeEnd}>
                        {saphirusGalleryProducts.map((product, productIndex) => {
                          const selectedQuantity = getCatalogQuantity(product.id);
                          const stockLimit = getStockLimit(product.stock);
                          const isQtyAtStockLimit = stockLimit !== null && selectedQuantity >= stockLimit;
                          const { primaryImageUrl, secondaryImageUrl, primaryImageAlt, secondaryImageAlt } = getCardImagePair(product);
                          const isInSaphirusMobilePage = productIndex >= saphirusMobileCarouselStart && productIndex < saphirusMobileCarouselStart + MOBILE_CAROUSEL_PAGE_SIZE;
                          const saphirusMobileCardIndex = productIndex - saphirusMobileCarouselStart;

                          return (
                            <article
                              key={isInSaphirusMobilePage ? `saphirus-${product.id}-anim-${saphirusMobileCarouselAnimKey}` : `saphirus-${product.id}`}
                              className={`product-card${isInSaphirusMobilePage ? "" : " mobile-carousel-hidden"}`}
                              style={isInSaphirusMobilePage ? { animationDelay: `${saphirusMobileCardIndex * 0.08}s` } : undefined}
                              role="button"
                              tabIndex={0}
                              onClick={() => openProductPreview(product)}
                              onKeyDown={(event) => {
                                if (event.target !== event.currentTarget) {
                                  return;
                                }

                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openProductPreview(product);
                                }
                              }}
                            >
                              <button
                                type="button"
                                className={`favorite-btn card-favorite-btn ${isProductFavorite(product.id) ? "is-active" : ""}`}
                                onClick={(event) => handleToggleFavorite(product, event)}
                                data-tooltip={isProductFavorite(product.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                                aria-label={isProductFavorite(product.id) ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}
                              >
                                <span aria-hidden="true">★</span>
                              </button>

                              <figure className={`product-image-stack${secondaryImageUrl ? " has-hover-image" : ""}`}>
                                <img
                                  className="product-image product-image-primary"
                                  src={primaryImageUrl}
                                  alt={primaryImageAlt}
                                />
                                {secondaryImageUrl && (
                                  <img
                                    className="product-image product-image-secondary"
                                    src={secondaryImageUrl}
                                    alt={secondaryImageAlt}
                                  />
                                )}
                              </figure>

                              <div className="product-card-content">
                                {product.brand && <p className="product-brand">{product.brand}</p>}
                                <h3 className="product-title">{product.name}</h3>
                                <p className="product-price">${Number(product.price).toLocaleString("es-AR")} ARS</p>

                                <div className="product-qty" aria-label={`Cantidad para ${product.name}`}>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      updateCatalogQuantity(product.id, -1);
                                    }}
                                    aria-label={`Quitar una unidad de ${product.name}`}
                                  >
                                    -
                                  </button>
                                  <span>{selectedQuantity}</span>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      updateCatalogQuantity(product.id, 1, stockLimit ?? 99);
                                    }}
                                    disabled={isQtyAtStockLimit}
                                    data-tooltip={isQtyAtStockLimit ? "Stock maximo alcanzado" : undefined}
                                    aria-label={`Agregar una unidad de ${product.name}`}
                                  >
                                    +
                                  </button>
                                </div>

                                {isQtyAtStockLimit && catalogQuantities[product.id] !== undefined && <p className="product-stock-limit-note">Stock maximo alcanzado</p>}

                                <button
                                  type="button"
                                  className="product-add-btn"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    addToCart(product, selectedQuantity);
                                  }}
                                >
                                  <span className="product-add-icon" aria-hidden="true">
                                    <svg viewBox="0 0 50 50" style={{width: '1.1em', height: '1.1em', display: 'inline-block', verticalAlign: 'middle'}}>
                                      <path fill="currentColor" d="M35 34H13c-.3 0-.6-.2-.8-.4s-.2-.6-.1-.9l1.9-4.8L12.1 10H6V8h7c.5 0 .9.4 1 .9l2 19c0 .2 0 .3-.1.5L14.5 32H36z"/>
                                      <path fill="currentColor" d="m15.2 29l-.4-2L38 22.2V14H14v-2h25c.6 0 1 .4 1 1v10c0 .5-.3.9-.8 1zM36 40c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-24 6c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
                                    </svg>
                                  </span>
                                  <span>Agregar al carrito</span>
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        className="carousel-arrow carousel-arrow-right"
                        onClick={() => scrollProductsRow("right", saphirusProductsRowRef)}
                        aria-label="Ver más productos Saphirus"
                      >
                        <span className="nav-arrow-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                            <path d="M7 10.5 12 15.5 17 10.5" />
                          </svg>
                        </span>
                      </button>

                      <div className="products-carousel-mobile-arrows">
                        <button
                          type="button"
                          className="carousel-arrow carousel-arrow-left"
                          onClick={() => { setSaphirusMobileCarouselPage((p) => Math.max(0, p - 1)); setSaphirusMobileCarouselAnimKey((k) => k + 1); }}
                          disabled={safeSaphirusMobileCarouselPage === 0}
                          aria-label="Ver productos Saphirus anteriores"
                        >
                          <span className="nav-arrow-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                              <path d="M7 10.5 12 15.5 17 10.5" />
                            </svg>
                          </span>
                        </button>
                        <span className="mobile-carousel-page-indicator">
                          {safeSaphirusMobileCarouselPage + 1} / {saphirusMobileCarouselTotalPages}
                        </span>
                        <button
                          type="button"
                          className="carousel-arrow carousel-arrow-right"
                          onClick={() => { setSaphirusMobileCarouselPage((p) => Math.min(saphirusMobileCarouselTotalPages - 1, p + 1)); setSaphirusMobileCarouselAnimKey((k) => k + 1); }}
                          disabled={safeSaphirusMobileCarouselPage >= saphirusMobileCarouselTotalPages - 1}
                          aria-label="Ver más productos Saphirus"
                        >
                          <span className="nav-arrow-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                              <path d="M7 10.5 12 15.5 17 10.5" />
                            </svg>
                          </span>
                        </button>
                      </div>
                    </section>
                  ) : (
                    <p className="empty-results">No encontramos productos en la categoría Saphirus por el momento.</p>
                  )}
                </section>
              )}

              {isInicioActive && (
                <section className="home-faq" aria-label="Preguntas frecuentes">
                  <h2>Preguntas Frecuentes</h2>

                  <div className="home-faq-list">
                    {HOME_FAQ_ITEMS.map((item) => {
                      const isOpen = openHomeFaqId === item.id;

                      return (
                        <article key={item.id} className={`home-faq-item${isOpen ? " is-open" : ""}`}>
                          <button
                            type="button"
                            className="home-faq-trigger"
                            aria-expanded={isOpen}
                            onClick={() => setOpenHomeFaqId((current) => (current === item.id ? "" : item.id))}
                          >
                            <span>{item.question}</span>
                            <span className={`home-faq-chevron${isOpen ? " is-open" : ""}`} aria-hidden="true">
                              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                                <path d="M7 10.5 12 15.5 17 10.5" />
                              </svg>
                            </span>
                          </button>

                          {isOpen && (
                            <div className="home-faq-answer">
                              {item.paragraphs.map((paragraph, index) => {
                                if (item.id === "cancel-order" && index === item.paragraphs.length - 1) {
                                  return (
                                    <p key={`${item.id}-${index}`}>
                                      En caso de que el pedido ya haya sido enviado, deberás gestionarlo como una devolución siguiendo nuestras{" "}
                                      <button
                                        type="button"
                                        className="home-faq-inline-link"
                                        onClick={() => handleOpenInfoPage("returns-exchanges")}
                                      >
                                        políticas
                                      </button>
                                      .
                                    </p>
                                  );
                                }

                                if (item.id === "cancel-order" && index === 0) {
                                  return (
                                    <p key={`${item.id}-${index}`}>
                                      Sí, podés solicitar la cancelación de tu pedido siempre y cuando aún no haya sido despachado. Para hacerlo, completá el formulario en la página{" "}
                                      <button
                                        type="button"
                                        className="home-faq-inline-link"
                                        onClick={() => handleOpenInfoPage("withdrawal-button")}
                                      >
                                        “Cancelar Pedido”
                                      </button>{" "}
                                      con tu número de orden y tus datos de contacto.
                                    </p>
                                  );
                                }

                                if (item.id === "cancel-order" && index === 1) {
                                  return (
                                    <p key={`${item.id}-${index}`}>
                                      Nuestro equipo revisará la solicitud y <strong>se comunicará con vos por email o WhatsApp</strong> para confirmarte el estado de la cancelación.
                                    </p>
                                  );
                                }

                                return <p key={`${item.id}-${index}`}>{paragraph}</p>;
                              })}

                              {item.id === "cancel-order" && (
                                <button
                                  type="button"
                                  className="home-faq-cancel-btn"
                                  onClick={() => handleOpenInfoPage("withdrawal-button")}
                                >
                                  <span className="home-faq-cancel-icon" aria-hidden="true">❌</span>
                                  <span>Cancelar pedido</span>
                                </button>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {isInicioActive && (
                <section className="home-google-reviews" aria-label="Comentarios de Google">
                  <div className="home-google-reviews-shell">
                    <div className="home-google-reviews-bubbles" aria-hidden="true">
                      <span className="home-google-bubble home-google-bubble-1" />
                      <span className="home-google-bubble home-google-bubble-2" />
                      <span className="home-google-bubble home-google-bubble-3" />
                    </div>

                    <div className="home-google-reviews-header">
                      <p className="home-google-reviews-kicker">Resenas verificadas</p>
                      <h2>Tu opinion nos importa</h2>
                      <p className="home-google-reviews-lead">
                        Ya compraste en <strong>La Boutique de la Limpieza</strong>?
                      </p>
                      <p>Calificacion general 4.6/5 basada en 46 opiniones publicas.</p>
                      <p className="home-google-reviews-help">
                        Tu resena nos ayuda a mejorar y tambien le sirve a otros clientes para conocernos.
                      </p>

                      <div className="home-google-reviews-metrics" aria-label="Resumen de resenas">
                        <article className="home-google-reviews-metric">
                          <strong>4.6</strong>
                          <span>Promedio</span>
                        </article>
                        <article className="home-google-reviews-metric">
                          <strong>46</strong>
                          <span>Opiniones</span>
                        </article>
                        <article className="home-google-reviews-metric">
                          <strong>93%</strong>
                          <span>4 o 5 estrellas</span>
                        </article>
                      </div>

                      <a
                        className="home-google-reviews-link"
                        href={GOOGLE_REVIEWS_URL}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Deja tu resena en Google ↗
                      </a>
                    </div>

                    <div className="home-google-reviews-list-wrap">
                      <div className="home-google-reviews-list" ref={reviewsListRef}>
                        {HOME_GOOGLE_REVIEWS.map((review) => (
                          <article
                            key={`${review.author}-${review.when}`}
                            className="home-google-review-card"
                          >
                            <header className="home-google-review-head">
                              <div className="home-google-review-author">
                                <span className="home-google-review-avatar" aria-hidden="true">
                                  {review.author.charAt(0).toUpperCase()}
                                </span>
                                <strong>{review.author}</strong>
                              </div>
                              <span>{review.when}</span>
                            </header>

                            <p className="home-google-review-stars" aria-label={`${review.rating} de 5`}>
                              {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                            </p>

                            <p>{review.text}</p>
                          </article>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="home-google-reviews-scroll-hint"
                        aria-label="Ver más reseñas"
                        onClick={() => {
                          const el = reviewsListRef.current;
                          if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
         </Suspense>
        </main>
      </div>

      <footer className="site-footer" aria-label="Pie de página">
          <div className="site-footer-inner">
            <div className="site-footer-mobile-logo-wrap" aria-hidden="true">
              <img className="site-footer-mobile-logo" src="/fotos/logo/La boutique de la limpiezalogo.webp" alt="" />
            </div>

            <div className="site-footer-top">
              <div className="site-footer-mobile-tabs" role="tablist" aria-label="Secciones del pie de página">
                {FOOTER_MOBILE_TABS.map((tab) => {
                  const isActive = activeFooterMobileTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`site-footer-mobile-tab${isActive ? " is-active" : ""}`}
                      onClick={() => handleFooterMobileTabChange(tab.id)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <section
                className={`site-footer-contact${activeFooterMobileTab === "contact" ? " is-mobile-active" : ""}`}
                aria-label="Contacto de la tienda"
              >
                <img className="site-footer-logo" src="/fotos/logo/La boutique de la limpiezalogo.webp" alt="La Boutique de la Limpieza" />

                <ul className="site-footer-contact-list">
                  <li>
                    <span className="site-footer-contact-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M12 7.5v5l3.3 1.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>Lunes a Viernes de 09:00 a 13:00 y de 15:30 a 19:00</span>
                  </li>
                  <li>
                    <span className="site-footer-contact-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="11" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    </span>
                    <span>Acevedo 200, esq Padilla, Villa Crespo. C1414 Cdad. Autónoma de Buenos Aires.</span>
                  </li>
                  <li>
                    <span className="site-footer-contact-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <rect x="3.5" y="6.5" width="17" height="11" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        <path d="m4 8 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <a href="mailto:laboutiqueacevedo200@gmail.com">laboutiqueacevedo200@gmail.com</a>
                  </li>
                  <li>
                    <span className="site-footer-contact-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <rect x="3.5" y="6.5" width="17" height="11" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        <path d="m4 8 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <a href="mailto:info@laboutiquedelalimpieza.com.ar">info@laboutiquedelalimpieza.com.ar</a>
                  </li>
                  <li>
                    <span className="site-footer-contact-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.08 5.18 2 2 0 0 1 5.07 3h3a2 2 0 0 1 2 1.72c.12.9.35 1.78.68 2.62a2 2 0 0 1-.45 2.11L9.09 10.91a16 16 0 0 0 4 4l1.46-1.21a2 2 0 0 1 2.11-.45c.84.33 1.72.56 2.62.68A2 2 0 0 1 22 16.92Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <a href="tel:+541155018399">011 15 5501-8399</a>
                  </li>
                </ul>

                <div className="site-footer-social" aria-label="Redes sociales">
                  <a href="#" aria-label="Facebook">
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                      <path d="M14.2 8.6h2V5.5h-2.4c-2.9 0-4.4 1.7-4.4 4.5v1.9H7.5V15h1.9v6h3.2v-6h2.5l.4-3.1h-2.9V10c0-.9.4-1.4 1.6-1.4Z" fill="currentColor" />
                    </svg>
                  </a>
                  <a href="#" aria-label="Instagram">
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                      <rect x="4" y="4" width="16" height="16" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" />
                    </svg>
                  </a>
                </div>
              </section>

              <nav
                className={`site-footer-column${activeFooterMobileTab === "account" ? " is-mobile-active" : ""}`}
                aria-label="Mi cuenta"
              >
                <h3>Mi Cuenta</h3>
                <ul>
                  {FOOTER_ACCOUNT_LINKS.map((item) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        className="site-footer-link-btn"
                        onClick={() => handleFooterAccountLinkClick(item.key)}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="site-footer-data-fiscal">
                  <button
                    type="button"
                    className="site-footer-data-fiscal-btn"
                    onClick={() => handleOpenInfoPage("fiscal-data")}
                    aria-label="Ver datos fiscales"
                  >
                    <img src="/fotos/DataFiscal.webp" alt="Data Fiscal" />
                  </button>
                </div>
              </nav>

              <nav
                className={`site-footer-column${activeFooterMobileTab === "categories" ? " is-mobile-active" : ""}`}
                aria-label="Categorías destacadas"
              >
                <h3>Categorías</h3>
                <ul>
                  {FOOTER_CATEGORY_LINKS.map((item) => (
                    <li key={item}>
                      <a href="#">{item}</a>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav
                className={`site-footer-column${activeFooterMobileTab === "info" ? " is-mobile-active" : ""}`}
                aria-label="Información legal y comercial"
              >
                <h3>Información</h3>
                <ul>
                  {FOOTER_INFO_LINKS.map((item) => (
                    <li key={item.label}>
                      {item.section ? (
                        <button
                          type="button"
                          className="site-footer-link-btn"
                          onClick={() => handleOpenInfoPage(item.section)}
                        >
                          {item.label}
                        </button>
                      ) : (
                        <a href="#">{item.label}</a>
                      )}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className="site-footer-repent-btn"
                  onClick={() => handleOpenInfoPage("withdrawal-button")}
                >
                  Botón de arrepentimiento
                </button>
              </nav>
            </div>

            <div className="site-footer-divider" />

            <div className="site-footer-payments">
              <p>Métodos de Pago:</p>
              <div className="site-footer-mercado-pago" aria-label="Mercado Pago">
                <img src="/fotos/mercado-pago.webp" alt="Mercado Pago" />
              </div>
            </div>

            <div className="site-footer-divider" />

            <div className="site-footer-bottom">
              <p className="site-footer-copyright">© 2025 La Boutique de la Limpieza | Todos los derechos reservados</p>
              <p className="site-footer-credit">Sitio web hecho por De Caso Marketing</p>
            </div>
          </div>
      </footer>

      <Suspense fallback={null}>
      <SmartOrderPanel
        isOpen={isSmartOrderOpen}
        onClose={() => setIsSmartOrderOpen(false)}
        products={products}
        onAddToCart={addToCart}
        onOpenCart={openCartDrawer}
      />
      </Suspense>
    </div>
  );
}

export default App;
