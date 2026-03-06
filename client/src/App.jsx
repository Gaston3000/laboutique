import { useEffect, useMemo, useRef, useState } from "react";
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
  deleteTicket,
  ensureOrderInvoice,
  deleteProduct,
  deleteProductVariant,
  fetchAdminCategories,
  fetchAdminAnalytics,
  fetchAdministrators,
  fetchCustomerActivity,
  fetchCustomerReorderItems,
  fetchCustomersHistory,
  fetchMembers,
  fetchLowStockAlerts,
  fetchOrders,
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
  quoteShipping,
  updateTicket,
  updateMyAddress,
  updateMyProfile,
  updateAdminCategory,
  updateOrderStatus,
  updateShippingRule,
  updateProduct,
  submitLegalTicket,
  uploadProductMedia,
  trackAnalyticsEvent
} from "./api";
import AdminPanel from "./components/AdminPanel";
import AccountPanel from "./components/AccountPanel";
import HomeBanners from "./components/HomeBanners";
import LoginModal from "./components/LoginModal";
import PromoStrip from "./components/PromoStrip";
import SiteHeader from "./components/SiteHeader";
import DeliveryCoverageSection from "./components/DeliveryCoverageSection";
import WelcomePromoSpotlight from "./components/WelcomePromoSpotlight";

const CATEGORY_PAGE_SIZE = 8;
const RECENT_SEARCHES_STORAGE_KEY = "search:recent:queries";
const RECENT_SEARCHES_LIMIT = 6;
const ADDRESS_BOOK_STORAGE_PREFIX = "address-book";
const MAX_ACCOUNT_ADDRESSES = 5;
const WELCOME_PROMO_CODE = "PRIMERACOMPRA10";
const ADMIN_NOTIFICATIONS_SEEN_STORAGE_KEY = "admin:notifications:seen:v1";

const FOOTER_ACCOUNT_LINKS = [
  "Mi Cuenta",
  "Mis Pedidos",
  "Mi Dirección",
  "Billetera",
  "Productos Favoritos"
];

const FOOTER_CATEGORY_LINKS = [
  "Líquidos de Piso",
  "Suavizantes",
  "Insecticidas",
  "Plumeros",
  "Trapos",
  "Velas"
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

  return getProductSearchableText(product).some((text) => isFuzzySearchMatch(query, text));
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

function App() {
  const [products, setProducts] = useState([]);
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
  const [pendingWelcomePromoFocus, setPendingWelcomePromoFocus] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [orders, setOrders] = useState([]);
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
    customerAddress: "",
    city: "Buenos Aires",
    region: "Buenos Aires",
    postalCode: "",
    country: "Argentina",
    consumerType: "consumidor-final",
    needsFacturaA: false,
    saveAddress: false,
    shippingMethod: "",
    shippingZone: "caba"
  });
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
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
  const [appliedCartPromotion, setAppliedCartPromotion] = useState(null);
  const [cartNoteMessage, setCartNoteMessage] = useState("");
  const [welcomePromoMessage, setWelcomePromoMessage] = useState("");
  const productsRowRef = useRef(null);
  const similarProductsRowRef = useRef(null);
  const adminNotificationsRef = useRef(null);
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem("cart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  async function refreshProducts() {
    const data = await fetchProducts();
    setProducts(data.items || []);
  }

  async function refreshOrders(token) {
    const data = await fetchOrders(token);
    setOrders(data.items || []);
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
      .catch(() => setProducts([]));
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
      Promise.all([
        refreshOrders(auth.token),
        refreshAdminData(auth.token),
        refreshTicketsData(auth.token, auth.user.role)
      ]).catch((error) => {
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

    refreshTicketsData(auth.token, auth.user.role).catch(() => {
      setTickets([]);
      setTicketMetrics({ open: 0, inProgress: 0, testing: 0, closed: 0 });
    });
  }, [auth]);

  useEffect(() => {
    const savedAddress = String(auth.user?.address || "").trim();

    if (!savedAddress) {
      return;
    }

    setCheckoutForm((current) => {
      if (String(current.customerAddress || "").trim()) {
        return current;
      }

      return {
        ...current,
        customerAddress: savedAddress
      };
    });
  }, [auth.user?.address]);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

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
          setIsCartDrawerOpen(false);
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
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }

    document.body.style.overflow = "";

    return () => {
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

  const cartDiscount = useMemo(
    () => Number(appliedCartPromotion?.discount || 0),
    [appliedCartPromotion]
  );

  const cartSubtotalAfterDiscount = useMemo(
    () => Math.max(0, Number((cartSubtotal - cartDiscount).toFixed(2))),
    [cartSubtotal, cartDiscount]
  );

  const checkoutShippingCost = useMemo(() => {
    if (checkoutForm.shippingMethod === "pickup") {
      return 0;
    }

    if (checkoutForm.shippingMethod === "delivery") {
      return checkoutForm.shippingZone === "caba" ? 5000 : 7000;
    }

    return 0;
  }, [checkoutForm.shippingMethod, checkoutForm.shippingZone]);

  const checkoutTotal = useMemo(
    () => cartSubtotalAfterDiscount + checkoutShippingCost,
    [cartSubtotalAfterDiscount, checkoutShippingCost]
  );

  const checkoutShippingSummaryLabel = useMemo(() => {
    if (checkoutForm.shippingMethod === "pickup") {
      return "Gratis";
    }

    if (checkoutForm.shippingMethod === "delivery") {
      return checkoutShippingCost === 0
        ? "$0 ARS"
        : `$${checkoutShippingCost.toLocaleString("es-AR")} ARS`;
    }

    return "Elegí un método";
  }, [checkoutForm.shippingMethod, checkoutShippingCost]);

  const checkoutShippingOptionValue = useMemo(() => {
    if (checkoutForm.shippingMethod === "pickup") {
      return "pickup";
    }

    if (checkoutForm.shippingMethod === "delivery") {
      return checkoutForm.shippingZone === "gba" ? "gba" : "caba";
    }

    return "";
  }, [checkoutForm.shippingMethod, checkoutForm.shippingZone]);

  useEffect(() => {
    setAppliedCartPromotion(null);
    setCartPromoMessage("");
  }, [cart]);

  useEffect(() => {
    if (activeSection !== "checkout-details") {
      return;
    }

    if (!auth.user || String(cartPromoCode || "").trim() || appliedCartPromotion?.code) {
      return;
    }

    setCartPromoCode(WELCOME_PROMO_CODE);
  }, [activeSection, auth.user, cartPromoCode, appliedCartPromotion]);

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

          return productCategories.some((category) => category.includes(normalizedSelectedCategory));
        });

    if (!normalizedSearch) {
      return categoryFilteredProducts;
    }

    return categoryFilteredProducts.filter((product) => matchesProductSearch(product, normalizedSearch));
  }, [products, searchTerm, selectedCategory]);

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
      return ["/fotos/foto-inicio.png"];
    }

    const urls = selectedProductMedia.map((item) => item.url).filter(Boolean);

    return urls.length ? urls : ["/fotos/foto-inicio.png"];
  }, [selectedProduct, selectedProductMedia]);

  const getCardImagePair = (product) => {
    const mediaItems = getProductMediaItems(product);
    const urls = mediaItems.map((item) => item.url).filter(Boolean);

    return {
      primaryImageUrl: urls[0] || "/fotos/foto-inicio.png",
      secondaryImageUrl: urls[1] || "",
      primaryImageAlt: getProductImageAlt(product, 0),
      secondaryImageAlt: getProductImageAlt(product, 1)
    };
  };

  const getProductImageUrl = (product) => {
    const urls = getProductMediaItems(product).map((item) => item.url).filter(Boolean);

    return urls[0] || product?.imageUrl || "/fotos/foto-inicio.png";
  };

  useEffect(() => {
    const defaultTitle = "La Boutique de la Limpieza";

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

    const existingScript = document.getElementById("product-seo-jsonld");
    if (existingScript) {
      existingScript.remove();
    }

    if (activeSection !== "product" || !selectedProduct) {
      document.title = defaultTitle;
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
    upsertMeta("property", "og:image", selectedProductImages[0] || "/fotos/foto-inicio.png");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", twitterTitle);
    upsertMeta("name", "twitter:description", twitterDescription);
    upsertMeta("name", "twitter:image", selectedProductImages[0] || "/fotos/foto-inicio.png");

    const canonicalFromSeo = String(seo.canonicalUrl || "").trim();
    const slug = String(seo.slug || "").trim();
    const canonicalHref = canonicalFromSeo || (slug ? `${window.location.origin}/producto/${slug}` : "");
    setCanonical(canonicalHref);

    const jsonLdScript = document.createElement("script");
    jsonLdScript.id = "product-seo-jsonld";
    jsonLdScript.type = "application/ld+json";
    jsonLdScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: baseName,
      description,
      image: selectedProductImages.filter(Boolean),
      brand: selectedProduct.brand ? { "@type": "Brand", name: selectedProduct.brand } : undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: "ARS",
        price: Number(selectedProduct.price || 0),
        availability: Number(selectedProduct.stock || 0) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock"
      }
    });
    document.head.appendChild(jsonLdScript);

    return () => {
      const scriptElement = document.getElementById("product-seo-jsonld");
      if (scriptElement) {
        scriptElement.remove();
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

    const visibleProducts = products.filter((product) => product.isVisible !== false && product.id !== selectedProduct.id);
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

  function addToCart(product, quantity = 1) {
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    const cartKey = `${product.id}:base`;
    const productImageUrl = getProductImageUrl(product);

    sendAnalytics("add_to_cart", {
      productId: product.id,
      productName: product.name,
      variantId: null,
      quantity: safeQuantity,
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

    setCart((currentCart) => {
      const itemIndex = currentCart.findIndex((item) => (item.cartKey || `${item.id}:base`) === cartKey);

      if (itemIndex === -1) {
        return [...currentCart, { ...product, cartKey, variantId: null, quantity: safeQuantity, imageUrl: productImageUrl }];
      }

      const updated = [...currentCart];
      updated[itemIndex] = {
        ...updated[itemIndex],
        quantity: updated[itemIndex].quantity + safeQuantity
      };

      return updated;
    });
  }

  function addVariantToCart(product, variant, quantity = 1) {
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    const optionLabel = [variant.presentation, variant.name].filter(Boolean).join(": ");
    const cartKey = `${product.id}:${variant.id}`;
    const unitPrice = Number(product.price || 0) + Number(variant.priceDelta || 0);
    const productImageUrl = getProductImageUrl(product);

    sendAnalytics("add_to_cart", {
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      quantity: safeQuantity,
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
            price: unitPrice,
            quantity: safeQuantity,
            imageUrl: productImageUrl
          }
        ];
      }

      const updated = [...currentCart];
      updated[itemIndex] = {
        ...updated[itemIndex],
        quantity: updated[itemIndex].quantity + safeQuantity
      };

      return updated;
    });
  }

  function updateCartQuantity(cartKey, nextQuantity) {
    setCart((currentCart) => {
      if (nextQuantity <= 0) {
        return currentCart.filter((item) => (item.cartKey || `${item.id}:base`) !== cartKey);
      }

      return currentCart.map((item) => (
        (item.cartKey || `${item.id}:base`) === cartKey
          ? { ...item, quantity: nextQuantity }
          : item
      ));
    });
  }

  function removeFromCart(cartKey) {
    setCart((currentCart) => currentCart.filter((item) => (item.cartKey || `${item.id}:base`) !== cartKey));
  }

  function clearCart() {
    setCart([]);
  }

  function openCartDrawer() {
    setIsAddPopupOpen(false);
    setIsCartDrawerOpen(true);
  }

  function closeCartDrawer() {
    setIsCartDrawerOpen(false);
  }

  function closeAddPopup() {
    setIsAddPopupOpen(false);
  }

  function openLoginModal(view = "register", inviteMessage = "") {
    setAuthError("");
    setLoginModalView(view === "login" ? "login" : "register");
    setLoginInviteMessage(inviteMessage);
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
    setSelectedProduct(product);
    setSelectedProductImageIndex(0);
    setOpenInfoSection("description");
    setActiveSection("product");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  function handleGoToCartPage() {
    setActiveSection("cart");
    closeCartDrawer();
  }

  function handleSelectCategory(categoryName) {
    const normalizedCategory = String(categoryName || "Todos los productos").trim() || "Todos los productos";

    sendAnalytics("category_select", {
      categoryName: normalizedCategory
    });

    setSelectedCategory(categoryName || "Todos los productos");
    setSearchInput("");
    setSearchTerm("");
    setActiveSection("home");
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

  function updateCatalogQuantity(productId, delta) {
    setCatalogQuantities((current) => {
      const currentValue = Number(current[productId] ?? 1);
      const nextValue = Math.max(1, Math.min(99, currentValue + delta));
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
    const amount = firstCard ? firstCard.getBoundingClientRect().width + rowGap : 240;

    rowRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth"
    });
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

    const resolvedCustomerAddress = checkoutForm.shippingMethod === "pickup"
      ? "Retiro en el local - Acevedo 200"
      : String(checkoutForm.customerAddress || auth.user?.address || "").trim();
    const firstName = String(checkoutForm.firstName || "").trim();
    const lastName = String(checkoutForm.lastName || "").trim();
    const joinedName = [firstName, lastName].filter(Boolean).join(" ");

    if (checkoutForm.shippingMethod === "delivery" && !resolvedCustomerAddress) {
      setCheckoutMessage("La dirección es obligatoria para concretar la compra.");
      return;
    }

    setIsCheckoutLoading(true);
    setCheckoutMessage("");

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

      const payload = {
        customerName,
        customerPhone,
        customerAddress: resolvedCustomerAddress,
        shippingMethod: checkoutForm.shippingMethod,
        shippingZone,
        promoCode: appliedCartPromotion?.code || null,
        items: cart.map((item) => ({
          productId: item.id,
            variantId: item.variantId || null,
          quantity: item.quantity
        }))
      };

      const result = await checkoutCart(payload, auth.token);
      const checkoutUrl = String(result?.payment?.checkoutUrl || "").trim();

      if (!checkoutUrl) {
        throw new Error("No se pudo generar el link de pago con Mercado Pago");
      }

      setCheckoutMessage("Redirigiendo a Mercado Pago...");
      window.location.assign(checkoutUrl);
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
    const address = String(authPayload?.address || "").trim();

    setIsAuthLoading(true);
    setAuthError("");

    try {
      const data = mode === "register"
        ? await register(name, email, password, address)
        : await login(email, password);

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

      sendAnalytics(mode === "register" ? "register" : "login", {
        role: userWithAddresses?.role || "client",
        emailDomain: String(email || "").includes("@") ? String(email).split("@").pop() : ""
      });
      setAuth({ token: data.token, user: userWithAddresses });
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
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  }

  function handleLogout() {
    setAuth({ token: null, user: null });
    setActiveSection("home");
    setAdminMessage("");
    setAnalyticsData(null);
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

  async function handleUploadProductMedia(files) {
    try {
      const data = await uploadProductMedia(auth.token, files);
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

  async function handleOrderStatusChange(orderId, status) {
    try {
      await updateOrderStatus(auth.token, orderId, status);
      await refreshOrders(auth.token);
      setAdminMessage("Estado de pedido actualizado");
    } catch (error) {
      setAdminMessage(error.message);
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
  const visibleCategoryProducts = isSpecificCategorySelected
    ? filteredProducts.slice(0, categoryVisibleCount)
    : filteredProducts;
  const visibleGridProducts = isSpecificCategorySelected ? visibleCategoryProducts : filteredProducts;
  const canLoadMoreCategoryProducts = isSpecificCategorySelected && filteredProducts.length > categoryVisibleCount;
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
    handleGoPromotionsSection({
      focusWelcomePromo: true,
      inviteMessage: "Iniciá sesión o registrate para activar tu beneficio de bienvenida del 10% OFF."
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
    <div className="page">
      <PromoStrip />
      <SiteHeader
        totalItems={totalItems}
        searchValue={searchInput}
        searchSuggestions={searchSuggestions}
        recentSearches={recentSearches}
        onRemoveRecentSearch={handleRemoveRecentSearch}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        user={auth.user}
        onAccountClick={() => openLoginModal("register")}
        onMyAccountClick={handleOpenMyAccount}
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
      />

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
        <div className="cart-drawer-backdrop" onClick={closeCartDrawer}>
          <aside
            className="cart-drawer"
            aria-label="Carrito"
            role="dialog"
            aria-modal="true"
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

            <div className="cart-drawer-body">
              {!cart.length ? (
                <p className="empty-results">Tu carrito está vacío.</p>
              ) : (
                <ul className="cart-drawer-list">
                  {cart.map((item) => (
                    <li key={item.cartKey || `${item.id}:base`} className="cart-drawer-line">
                      <img className="cart-drawer-image" src={getProductImageUrl(item)} alt={getProductImageAlt(item, 0)} />

                      <div className="cart-drawer-info">
                        <h3>{item.name}</h3>
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
                              aria-label={`Agregar una unidad de ${item.name}`}
                            >
                              +
                            </button>
                          </div>

                          <strong className="cart-drawer-line-total">
                            ${(Number(item.price) * item.quantity).toLocaleString("es-AR")} ARS
                          </strong>
                        </div>
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
              )}
            </div>

            <footer className="cart-drawer-footer">
              <button type="button" className="cart-promo-btn" onClick={handleGoToCartPage}>
                <span className="cart-promo-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12.5 12.5 4H20v7.5L11.5 20 4 12.5Z" />
                    <circle cx="15.2" cy="8.8" r="1.2" />
                  </svg>
                </span>
                <span>Ingresar código de promoción</span>
              </button>

              <div className="cart-drawer-total-wrap">
                <div className="cart-drawer-total-row">
                  <span>Total estimado</span>
                  <strong>${cartSubtotal.toLocaleString("es-AR")} ARS</strong>
                </div>
                <p>
                  Los gastos de envío y los impuestos aplicables se determinan al finalizar la compra.
                  Los precios exhibidos incluyen IVA.
                </p>
              </div>

              <button type="button" className="cart-pay-btn" onClick={handleGoToCartPage}>
                Ver carrito y pagar
              </button>

              <p className="cart-secure-note">
                <span aria-hidden="true">🔒</span>
                <span>Pago seguro</span>
              </p>
            </footer>
          </aside>
        </div>
      )}

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setLoginInviteMessage("");
          setPendingWelcomePromoFocus(false);
        }}
        onSubmit={handleLogin}
        isLoading={isAuthLoading}
        error={authError}
        initialView={loginModalView}
        inviteMessage={loginInviteMessage}
      />

      <nav className="nav-bar">
        <div className="container nav-inner">
          <button
            type="button"
            className="shipping-cta-btn"
            aria-label="Elegí tu zona de envío"
            onClick={handleOpenMyAddress}
          >
            <span className="shipping-cta-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
            </span>
            <span>{shippingButtonLabel}</span>
          </button>

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
          </ul>
        </div>
      </nav>

      <div className="container">

        <main className={isInicioActive ? "main-home" : ""}>
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
              onCreateTicket={handleCreateTicket}
              onUpdateTicket={handleUpdateTicket}
              onAddTicketComment={handleAddTicketComment}
              onCloseTicket={handleCloseTicket}
              onDeleteTicket={handleDeleteTicket}
              onReloadTickets={handleReloadTickets}
              onReloadAnalytics={handleReloadAdminAnalytics}
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
                  <img src="/fotos/bannerEnvio.png" alt="Promoción de envíos gratis en CABA y Gran Buenos Aires" />
                </div>
              </article>
            </section>
          ) : activeSection === "about" ? (
            <section className="about-view" aria-label="Sobre Nosotros">
              <section className="about-hero" aria-label="Nuestra historia">
                <div className="about-hero-media">
                  <img
                    src="/fotos/NahuelyGri.jpg"
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
                src="/fotos/Logo AI.png"
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
                src="/fotos/Logo AI.png"
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
                src="/fotos/Logo AI.png"
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
                src="/fotos/Logo AI.png"
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
                src="/fotos/Logo AI.png"
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
                  <img src="/fotos/DataFiscal.jpg" alt="Data Fiscal AFIP" />
                </a>
              </div>
            </section>
          ) : activeSection === "complaints-book" ? (
            <section className="legal-info-view legal-terms-view" aria-label="Libro de Quejas Online">
              <img
                className="legal-info-logo"
                src="/fotos/Logo AI.png"
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
                src="/fotos/Logo AI.png"
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
                  20409938311 (Constancia de CUIL Link: <a href="/fotos/DataFiscal.jpg" target="_blank" rel="noreferrer">ver más</a>)
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
                src="/fotos/Logo AI.png"
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
                src="/fotos/Logo AI.png"
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
                <p className="empty-results">Tu carrito está vacío.</p>
              ) : (
                <div className="cart-checkout-layout">
                  <div className="cart-products-panel">
                    <ul className="cart-list">
                      {cart.map((item) => (
                        <li key={item.cartKey || `${item.id}:base`} className="cart-line">
                          <div className="cart-line-main">
                            <img
                              className="cart-line-image"
                              src={getProductImageUrl(item)}
                              alt={getProductImageAlt(item, 0)}
                            />

                            <div>
                              <h2>{item.name}</h2>
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
                                aria-label={`Agregar una unidad de ${item.name}`}
                              >
                                +
                              </button>
                            </div>

                            <strong>
                              {(Number(item.price) * item.quantity).toLocaleString("es-AR")},00 ARS
                            </strong>

                            <button
                              type="button"
                              className="cart-remove-btn"
                              onClick={() => removeFromCart(item.cartKey || `${item.id}:base`)}
                              aria-label={`Eliminar ${item.name}`}
                            >
                              🗑
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
                        <span className="cart-extra-icon" aria-hidden="true">🏷️</span>
                        <span>Ingresar código promocional</span>
                      </button>
                      {isCartPromoOpen && (
                        <div className="cart-extra-panel" aria-label="Código promocional">
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
                      {isCartPromoOpen && cartPromoMessage && <p className="cart-promo-message">{cartPromoMessage}</p>}

                      <button
                        type="button"
                        className="cart-extra-link"
                        onClick={() => setIsCartNoteOpen((current) => !current)}
                      >
                        <span className="cart-extra-icon" aria-hidden="true">📝</span>
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
                          <span>Recogida</span>
                          <strong>{checkoutShippingSummaryLabel}</strong>
                        </div>

                        <a href="#" onClick={(event) => event.preventDefault()} className="checkout-shipping-country">
                          Buenos Aires, Argentina
                        </a>

                        <label className="checkout-shipping-picker">
                          <select
                            value={checkoutShippingOptionValue}
                            onChange={(event) => {
                              const selected = event.target.value;
                              setCheckoutForm((current) => ({
                                ...current,
                                shippingMethod: selected === "pickup" ? "pickup" : "delivery",
                                shippingZone: selected === "gba" ? "gba" : "caba"
                              }));
                            }}
                            required
                          >
                            <option value="">Elegí una opción</option>
                            <option value="pickup">Retiro en el local - Acevedo 200 (Gratis)</option>
                            <option value="caba">CABA - 5000,00 ARS</option>
                            <option value="gba">Morón - 7000,00 ARS</option>
                          </select>
                        </label>

                        <div className="checkout-summary-row checkout-total-row">
                          <span>Total</span>
                          <strong>{checkoutTotal.toLocaleString("es-AR")},00 ARS</strong>
                        </div>

                        <button type="button" disabled={isCheckoutLoading} onClick={handleOpenCheckoutDetails}>
                          Finalizar compra
                        </button>

                        <p className="checkout-security-note">🔒 Pago seguro</p>
                      </aside>
                    </form>
                  </section>
                </div>
              )}
            </section>
          ) : activeSection === "checkout-details" ? (
            <section className="checkout-details-view" aria-label="Página de pago">
              <header className="checkout-details-header">
                <div className="checkout-details-title-wrap">
                  <img src="/fotos/Logo AI.png" alt="La Boutique de la Limpieza" className="checkout-details-logo" />
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

                    <label>
                      <span>Método de entrega *</span>
                      <select
                        value={checkoutShippingOptionValue}
                        onChange={(event) => {
                          const selected = event.target.value;
                          setCheckoutForm((current) => ({
                            ...current,
                            shippingMethod: selected === "pickup" ? "pickup" : "delivery",
                            shippingZone: selected === "gba" ? "gba" : "caba"
                          }));
                        }}
                        required
                      >
                        <option value="">Elegí una opción</option>
                        <option value="caba">Entrega en CABA (5000,00 ARS)</option>
                        <option value="gba">Entrega en GBA (7000,00 ARS)</option>
                        <option value="pickup">Retiro en el local - Acevedo 200</option>
                      </select>
                    </label>

                    <p className="checkout-details-help">
                      Seleccioná si preferís recibir el pedido a domicilio en CABA o Gran Buenos Aires, o retirarlo en nuestra tienda de Villa Crespo.
                    </p>

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

                    <label>
                      <span>País/región *</span>
                      <select
                        value={checkoutForm.country}
                        onChange={(event) => setCheckoutForm((current) => ({ ...current, country: event.target.value }))}
                      >
                        <option value="Argentina">Argentina</option>
                      </select>
                    </label>

                    <label>
                      <span>Dirección *</span>
                      <input
                        type="text"
                        value={checkoutForm.customerAddress}
                        onChange={(event) => setCheckoutForm((current) => ({ ...current, customerAddress: event.target.value }))}
                        required={checkoutForm.shippingMethod === "delivery"}
                      />
                    </label>

                    <label>
                      <span>Ciudad *</span>
                      <input
                        type="text"
                        value={checkoutForm.city}
                        onChange={(event) => setCheckoutForm((current) => ({ ...current, city: event.target.value }))}
                      />
                    </label>

                    <label>
                      <span>Región *</span>
                      <input
                        type="text"
                        value={checkoutForm.region}
                        onChange={(event) => setCheckoutForm((current) => ({ ...current, region: event.target.value }))}
                      />
                    </label>

                    <label>
                      <span>Código postal *</span>
                      <input
                        type="text"
                        value={checkoutForm.postalCode}
                        onChange={(event) => setCheckoutForm((current) => ({ ...current, postalCode: event.target.value }))}
                      />
                    </label>

                    <label className="checkout-checkbox-row">
                      <input
                        type="checkbox"
                        checked={checkoutForm.saveAddress}
                        onChange={(event) => setCheckoutForm((current) => ({ ...current, saveAddress: event.target.checked }))}
                      />
                      Guardar esta dirección
                    </label>

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

                  <div className="checkout-details-totals">
                    <p><span>Subtotal</span><strong>{cartSubtotal.toLocaleString("es-AR")},00 ARS</strong></p>
                    {cartDiscount > 0 && <p><span>Descuento</span><strong>-{cartDiscount.toLocaleString("es-AR")} ARS</strong></p>}
                    <p><span>Entrega/envío</span><strong>{checkoutShippingCost.toLocaleString("es-AR")},00 ARS</strong></p>
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
                                updateCatalogQuantity(product.id, 1);
                              }}
                              aria-label={`Agregar una unidad de ${product.name}`}
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            className="product-add-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              addToCart(product, selectedQuantity);
                            }}
                          >
                            <span className="product-add-icon" aria-hidden="true">🛒</span>
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
            />
          ) : activeSection === "product" && selectedProduct ? (
            <section className="product-detail-view" aria-label="Detalle de producto">
              <button type="button" className="product-detail-back" onClick={() => setActiveSection("home")}>
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
                        onClick={() => updateCatalogQuantity(selectedProduct.id, 1)}
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
                      <span className="product-add-icon" aria-hidden="true">🛒</span>
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
                      <li>✔ Entrega rápida: recibí tu pedido dentro de los 3 días hábiles</li>
                      <li>✔ Promociones semanales exclusivas para miembros</li>
                    </ul>
                    <p>
                      🏷️ Hacete miembro de La Boutique de la Limpieza - <a href="#">Clic aquí</a>
                    </p>
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
                      className="carousel-arrow"
                      onClick={() => scrollProductsRow("left", similarProductsRowRef)}
                      aria-label="Ver productos similares anteriores"
                    >
                      ‹
                    </button>

                    <div className="products-row" ref={similarProductsRowRef}>
                      {relatedProducts.map((product) => {
                        const selectedQuantity = getCatalogQuantity(product.id);
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

                              <button
                                type="button"
                                className="product-add-btn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  addToCart(product, selectedQuantity);
                                }}
                              >
                                <span className="product-add-icon" aria-hidden="true">🛒</span>
                                <span>Agregar al carrito</span>
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      className="carousel-arrow"
                      onClick={() => scrollProductsRow("right", similarProductsRowRef)}
                      aria-label="Ver más productos similares"
                    >
                      ›
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

              {isInicioActive && (
                <WelcomePromoSpotlight
                  onActivate={handleActivateWelcomePromo}
                />
              )}

              <div id="home-catalog-start" />
              <h1>{isInicioActive ? "Inicio" : catalogHeading}</h1>
              <p className="subtitle">{catalogSubtitle}</p>
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

              {filteredProducts.length ? (
                shouldRenderGridProducts ? (
                  <>
                    <section className="products-grid" aria-label={isSpecificCategorySelected ? `Productos de ${selectedCategory}` : "Resultados de búsqueda"}>
                      {visibleGridProducts.map((product) => {
                        const selectedQuantity = getCatalogQuantity(product.id);
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
                                    updateCatalogQuantity(product.id, 1);
                                  }}
                                  aria-label={`Agregar una unidad de ${product.name}`}
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                className="product-add-btn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  addToCart(product, selectedQuantity);
                                }}
                              >
                                <span className="product-add-icon" aria-hidden="true">🛒</span>
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
                  </>
                ) : (
                  <section className="products-carousel" aria-label="Productos">
                    <button
                      type="button"
                      className="carousel-arrow"
                      onClick={() => scrollProductsRow("left")}
                      aria-label="Ver productos anteriores"
                    >
                      ‹
                    </button>

                    <div className="products-row" ref={productsRowRef}>
                      {filteredProducts.map((product) => {
                      const selectedQuantity = getCatalogQuantity(product.id);
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
                                data-tooltip={isProductFavorite(product.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateCatalogQuantity(product.id, 1);
                                }}
                                aria-label={`Agregar una unidad de ${product.name}`}
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              className="product-add-btn"
                              onClick={(event) => {
                                event.stopPropagation();
                                addToCart(product, selectedQuantity);
                              }}
                            >
                              <span className="product-add-icon" aria-hidden="true">🛒</span>
                              <span>Agregar al carrito</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                    </div>

                    <button
                      type="button"
                      className="carousel-arrow"
                      onClick={() => scrollProductsRow("right")}
                      aria-label="Ver más productos"
                    >
                      ›
                    </button>
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

                    <div className="home-google-reviews-list">
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
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      <footer className="site-footer" aria-label="Pie de página">
          <div className="site-footer-inner">
            <div className="site-footer-mobile-logo-wrap" aria-hidden="true">
              <img className="site-footer-mobile-logo" src="/fotos/Logo AI.png" alt="" />
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
                      onClick={() => setActiveFooterMobileTab(tab.id)}
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
                <img className="site-footer-logo" src="/fotos/Logo AI.png" alt="La Boutique de la Limpieza" />

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
                    <li key={item}>
                      <a href="#">{item}</a>
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
                    <img src="/fotos/DataFiscal.jpg" alt="Data Fiscal" />
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
                <img src="/fotos/mercado-pago.jpg" alt="Mercado Pago" />
              </div>
            </div>

            <div className="site-footer-divider" />

            <div className="site-footer-bottom">
              <p className="site-footer-copyright">© 2025 La Boutique de la Limpieza | Todos los derechos reservados</p>
              <p className="site-footer-credit">Sitio web hecho por De Caso Marketing</p>
            </div>
          </div>
      </footer>
    </div>
  );
}

export default App;
