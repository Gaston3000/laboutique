import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ── Text helpers ───────────────────────────────────────── */

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOrtho(value) {
  return normalize(value)
    .replace(/nv/g, "mb")
    .replace(/nb/g, "mb")
    .replace(/v/g, "b")
    .replace(/c(?=[ei])/g, "s")
    .replace(/z/g, "s")
    .replace(/ll/g, "y")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── Relevance scoring ──────────────────────────────────── */

function scoreProduct(product, query) {
  if (!query) return Infinity;

  const q = normalize(query);
  const qo = normalizeOrtho(query);
  if (!q) return Infinity;

  const name = normalize(product.name);
  const brand = normalize(product.brand);
  const cats = (product.categories || []).map((c) => normalize(typeof c === "string" ? c : c?.name || "")).join(" ");
  const keywords = Array.isArray(product.seo?.keywords) ? product.seo.keywords.map(normalize).join(" ") : "";
  const combined = `${name} ${brand} ${cats} ${keywords}`;
  const combinedOrtho = normalizeOrtho(combined);

  // Exact name match
  if (name === q) return 0;
  // Name starts with query
  if (name.startsWith(q)) return 1;
  // Name contains query
  if (name.includes(q) || normalize(product.name).includes(qo)) return 2;
  // Brand exact
  if (brand === q) return 3;
  // Brand starts with
  if (brand.startsWith(q)) return 4;
  // Combined contains all query words
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => combined.includes(w) || combinedOrtho.includes(normalizeOrtho(w)))) return 5;
  // Single word in combined
  if (combined.includes(q) || combinedOrtho.includes(qo)) return 6;
  // Partial word match (any query word appears anywhere)
  if (words.some((w) => combined.includes(w))) return 7;

  return Infinity;
}

/* ── Media helper ───────────────────────────────────────── */

function getFirstImageUrl(product) {
  if (!Array.isArray(product?.media)) return "/fotos/foto-inicio.webp";
  const item = product.media.find((m) => m && typeof m === "object" && m.url);
  return item?.url || "/fotos/foto-inicio.webp";
}

/* ── Trending / popular categories & searches ───────────── */

const POPULAR_SEARCH_TERMS = [
  "lavandina",
  "detergente",
  "limpiador de pisos",
  "desodorante de ambiente",
  "jabón líquido",
  "esponja",
  "desengrasante",
  "suavizante"
];

/* ── Hook ───────────────────────────────────────────────── */

export default function useAdvancedSearch({ products, searchInput, recentSearches }) {
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef(null);

  // Debounce input → 300ms
  useEffect(() => {
    const trimmed = String(searchInput || "").trim();
    clearTimeout(timerRef.current);
    if (!trimmed) {
      setDebouncedQuery("");
      setActiveIndex(-1);
      return;
    }
    timerRef.current = setTimeout(() => setDebouncedQuery(trimmed), 300);
    return () => clearTimeout(timerRef.current);
  }, [searchInput]);

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  // Visible products only
  const visibleProducts = useMemo(
    () => products.filter((p) => p.isVisible !== false),
    [products]
  );

  /* ── Search results (max 5 products with images) ────── */
  const searchResults = useMemo(() => {
    if (!debouncedQuery) return [];
    return visibleProducts
      .map((p) => ({ product: p, score: scoreProduct(p, debouncedQuery) }))
      .filter((item) => item.score < Infinity)
      .sort((a, b) => a.score - b.score || String(a.product.name).localeCompare(String(b.product.name), "es"))
      .slice(0, 5)
      .map((item) => ({
        id: item.product.id,
        name: String(item.product.name || ""),
        brand: String(item.product.brand || ""),
        category: Array.isArray(item.product.categories) ? String(item.product.categories[0]?.name || item.product.categories[0] || "") : "",
        price: Number(item.product.price || 0),
        image: getFirstImageUrl(item.product),
        product: item.product
      }));
  }, [visibleProducts, debouncedQuery]);

  /* ── Recommendations (popular / random visible picks) ── */
  const recommendations = useMemo(() => {
    // Pick products that have media to look good in the recommendations
    const withMedia = visibleProducts.filter(
      (p) => Array.isArray(p.media) && p.media.length > 0 && p.media[0]?.url
    );

    // Use a seeded shuffle so the list stays stable per session but varies between visits
    const pool = withMedia.length >= 6 ? withMedia : visibleProducts;
    const shuffled = [...pool];
    let seed = 42;
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      const j = seed % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, 6).map((p, idx) => ({
      id: p.id,
      name: String(p.name || ""),
      brand: String(p.brand || ""),
      price: Number(p.price || 0),
      image: getFirstImageUrl(p),
      badge: idx < 3 ? "Popular" : "Recomendado",
      product: p
    }));
  }, [visibleProducts]);

  /* ── Suggested search terms ────────────────────────────── */
  const suggestedSearches = useMemo(() => {
    if (!debouncedQuery) {
      // When idle, show popular terms
      return POPULAR_SEARCH_TERMS.slice(0, 5);
    }

    const q = normalize(debouncedQuery);
    // Filter popular terms that match
    const fromPopular = POPULAR_SEARCH_TERMS.filter((t) => normalize(t).includes(q) && normalize(t) !== q);

    // Also generate from product names / brands
    const seen = new Set(fromPopular.map(normalize));
    const fromProducts = [];
    for (const p of visibleProducts) {
      const name = String(p.name || "").trim();
      const nName = normalize(name);
      if (nName.includes(q) && !seen.has(nName) && nName !== q) {
        seen.add(nName);
        fromProducts.push(name);
        if (fromProducts.length >= 6) break;
      }
    }

    return [...fromPopular, ...fromProducts].slice(0, 5);
  }, [visibleProducts, debouncedQuery]);

  /* ── Flat items list for keyboard nav ──────────────────── */
  const flatItems = useMemo(() => {
    const items = [];

    searchResults.forEach((r) => items.push({ type: "result", data: r }));
    recommendations.forEach((r) => items.push({ type: "recommendation", data: r }));
    suggestedSearches.forEach((s) => items.push({ type: "suggestion", data: s }));

    return items;
  }, [searchResults, recommendations, suggestedSearches]);

  /* ── Keyboard handler ──────────────────────────────────── */
  const handleKeyDown = useCallback(
    (event) => {
      const totalItems = flatItems.length;
      if (!totalItems) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % totalItems);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? totalItems - 1 : prev - 1));
      }
    },
    [flatItems.length]
  );

  const getActiveItem = useCallback(() => {
    if (activeIndex < 0 || activeIndex >= flatItems.length) return null;
    return flatItems[activeIndex];
  }, [activeIndex, flatItems]);

  const resetActiveIndex = useCallback(() => setActiveIndex(-1), []);

  return {
    debouncedQuery,
    searchResults,
    recommendations,
    suggestedSearches,
    flatItems,
    activeIndex,
    handleKeyDown,
    getActiveItem,
    resetActiveIndex
  };
}
