import { useEffect, useRef } from "react";

/* ── Highlight matching text ────────────────────────────── */

function HighlightMatch({ text, query }) {
  if (!query) return <span>{text}</span>;

  const normalize = (v) =>
    String(v || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const normalizedText = normalize(text);
  const normalizedQuery = normalize(query);

  const idx = normalizedText.indexOf(normalizedQuery);
  if (idx === -1) return <span>{text}</span>;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);

  return (
    <span>
      {before}
      <mark className="search-highlight">{match}</mark>
      {after}
    </span>
  );
}

/* ── Section header ─────────────────────────────────────── */

function SectionHeader({ icon, title }) {
  return (
    <div className="sd-section-header">
      <span className="sd-section-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon }} />
      <span className="sd-section-title">{title}</span>
    </div>
  );
}

/* ── Main dropdown ──────────────────────────────────────── */

export default function SearchDropdown({
  isOpen,
  query,
  searchResults,
  hasMoreResults,
  loadMoreResults,
  recommendations,
  suggestedSearches,
  recentSearches,
  activeIndex,
  flatItems,
  onSelectProduct,
  onSelectSearch,
  onRemoveRecentSearch,
  onClearRecentSearches
}) {
  const listRef = useRef(null);
  const hasQuery = !!String(query || "").trim();
  const hasResults = searchResults.length > 0;
  const hasRecommendations = recommendations.length > 0;
  const hasSuggested = suggestedSearches.length > 0;
  const hasRecent = Array.isArray(recentSearches) && recentSearches.length > 0;
  const isEmpty = hasQuery && !hasResults && !hasSuggested;

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-search-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!isOpen) return null;

  // Build a global index counter
  let globalIndex = 0;

  function getGlobalIndex() {
    return globalIndex++;
  }

  /* ── Icons (inline SVGs) ─────────────────────────────── */

  const icons = {
    search: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 3a7.5 7.5 0 0 1 5.95 12.08l4.24 4.24a1 1 0 0 1-1.42 1.42l-4.24-4.24A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"/></svg>`,
    trending: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>`,
    star: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 9.95 11h-2.02A8 8 0 1 1 12 4a7.9 7.9 0 0 1 5.66 2.34L14 10h8V2l-2.92 2.92A9.93 9.93 0 0 0 12 2Zm-1 5v6.42l4.32 2.49 1-1.73L13 12.25V7h-2Z"/></svg>`,
    sparkle: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.4 8.8 22 9.6 16.4 14.4 18 22 12 18.4 6 22 7.6 14.4 2 9.6 9.6 8.8z"/></svg>`
  };

  return (
    <div className="sd-overlay" ref={listRef} role="listbox" aria-label="Resultados de búsqueda">
      {/* ── A) Search Results ──────────────────────────── */}
      {hasQuery && hasResults && (
        <div className="sd-section sd-section-results">
          <SectionHeader icon={icons.search} title="Resultados" />
          <div className="sd-results-list">
            {searchResults.map((item) => {
              const idx = getGlobalIndex();
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sd-result-item${activeIndex === idx ? " sd-active" : ""}`}
                  data-search-index={idx}
                  role="option"
                  aria-selected={activeIndex === idx}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectProduct(item.product)}
                >
                  <div className="sd-result-image">
                    <img src={item.image} alt={item.name} loading="lazy" />
                  </div>
                  <div className="sd-result-info">
                    <span className="sd-result-name">
                      <HighlightMatch text={item.name} query={query} />
                    </span>
                    <span className="sd-result-meta">
                      {item.brand && (
                        <span className="sd-result-brand">
                          <HighlightMatch text={item.brand} query={query} />
                        </span>
                      )}
                      {item.category && (
                        <>
                          {item.brand && <span className="sd-meta-dot">·</span>}
                          <span className="sd-result-category">{item.category}</span>
                        </>
                      )}
                    </span>
                  </div>
                  {item.price > 0 && (
                    <span className="sd-result-price">
                      ${item.price.toLocaleString("es-AR")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* "Cargar más" button */}
          {hasMoreResults && (
            <button
              type="button"
              className="sd-load-more"
              onMouseDown={(e) => e.preventDefault()}
              onClick={loadMoreResults}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="sd-load-more-icon">
                <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              Cargar más resultados
            </button>
          )}
          {/* "Ver todos" link */}
          <button
            type="button"
            className="sd-view-all"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelectSearch(query)}
          >
            Ver todos los resultados para "<strong>{query}</strong>"
            <svg viewBox="0 0 24 24" fill="currentColor" className="sd-view-all-icon">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
            </svg>
          </button>
        </div>
      )}

      {/* ── No results ─────────────────────────────────── */}
      {isEmpty && (
        <div className="sd-section sd-section-empty">
          <div className="sd-empty">
            <span className="sd-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.5 3a7.5 7.5 0 0 1 5.95 12.08l4.24 4.24a1 1 0 0 1-1.42 1.42l-4.24-4.24A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z" />
              </svg>
            </span>
            <p className="sd-empty-text">No encontramos resultados para "<strong>{query}</strong>"</p>
            <p className="sd-empty-hint">Probá con otra palabra o revisá la ortografía</p>
          </div>
        </div>
      )}



      {/* ── C) Recent Searches (when idle) ─────────────── */}
      {!hasQuery && hasRecent && (
        <div className="sd-section sd-section-recent">
          <div className="sd-section-header">
            <span className="sd-section-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icons.clock }} />
            <span className="sd-section-title">Búsquedas recientes</span>
            {onClearRecentSearches && (
              <button
                type="button"
                className="sd-clear-recent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onClearRecentSearches}
              >
                Borrar todo
              </button>
            )}
          </div>
          <div className="sd-suggestions-list">
            {recentSearches.slice(0, 6).map((term) => {
              const idx = getGlobalIndex();
              return (
                <div key={term} className="sd-suggestion-row">
                  <button
                    type="button"
                    className={`sd-suggestion-btn${activeIndex === idx ? " sd-active" : ""}`}
                    data-search-index={idx}
                    role="option"
                    aria-selected={activeIndex === idx}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSelectSearch(term)}
                  >
                    <span className="sd-suggestion-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icons.clock }} />
                    <span>{term}</span>
                  </button>
                  {onRemoveRecentSearch && (
                    <button
                      type="button"
                      className="sd-suggestion-remove"
                      aria-label={`Quitar ${term}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onRemoveRecentSearch(term)}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── D) Suggested Searches ──────────────────────── */}
      {hasSuggested && (
        <div className="sd-section sd-section-suggested">
          <SectionHeader
            icon={hasQuery ? icons.search : icons.trending}
            title={hasQuery ? "Búsquedas sugeridas" : "Búsquedas populares"}
          />
          <div className="sd-suggestions-list">
            {suggestedSearches.map((term) => {
              const idx = getGlobalIndex();
              return (
                <button
                  key={term}
                  type="button"
                  className={`sd-suggestion-btn${activeIndex === idx ? " sd-active" : ""}`}
                  data-search-index={idx}
                  role="option"
                  aria-selected={activeIndex === idx}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectSearch(term)}
                >
                  <span className="sd-suggestion-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: hasQuery ? icons.search : icons.trending }} />
                  <span>
                    {hasQuery ? <HighlightMatch text={term} query={query} /> : term}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
