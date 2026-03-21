import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CategoriesMenu from "./CategoriesMenu";

export default function SiteHeader({
  totalItems,
  searchValue,
  searchSuggestions,
  recentSearches,
  onRemoveRecentSearch,
  onSearchInputChange,
  onSearchSubmit,
  user,
  onAccountClick,
  onLoginClick,
  onMyAccountClick,
  onOrdersClick,
  onLogout,
  onFavoritesClick,
  onCartClick,
  onSelectCategory,
  isAdmin,
  activeSection,
  onGoHome,
  onGoPromotions,
  onGoAbout,
  onGoAdmin,
  showHeader,
  onRepeatOrder,
  hasOrders,
  onSmartOrder
}) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const searchRef = useRef(null);

  const normalizedInput = String(searchValue || "").trim();
  const filteredRecentSearches = useMemo(() => {
    const seen = new Set();

    return (recentSearches || [])
      .map((option) => String(option || "").trim())
      .filter(Boolean)
      .filter((option) => {
        const key = option.toLowerCase();

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [recentSearches]);

  const filteredSuggestions = useMemo(() => {
    if (!normalizedInput) {
      return [];
    }
    const seen = new Set();

    return (searchSuggestions || [])
      .map((option) => String(option || "").trim())
      .filter(Boolean)
      .filter((option) => {
        const key = option.toLowerCase();

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [normalizedInput, searchSuggestions]);

  const isShowingRecentSearches = !normalizedInput;
  const activeSuggestions = normalizedInput ? filteredSuggestions : filteredRecentSearches;
  const suggestionsAriaLabel = normalizedInput ? "Sugerencias de búsqueda" : "Últimas búsquedas";
  const shouldShowSuggestions = isSuggestionsOpen && activeSuggestions.length > 0;

  useEffect(() => {
    setIsAccountMenuOpen(false);
  }, [user]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }

      if (!searchRef.current?.contains(event.target)) {
        setIsSuggestionsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        setIsSuggestionsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const avatarSource = String(user?.avatarUrl || "").trim();
  const accountAddress = useMemo(() => {
    const primaryAddress = Array.isArray(user?.addressBook)
      ? user.addressBook.find((entry) => entry?.id === user?.primaryAddressId) || user.addressBook[0]
      : null;

    if (primaryAddress) {
      const street = String(primaryAddress.street || "").trim();
      const height = String(primaryAddress.height || "").trim();
      const headline = [street, height].filter(Boolean).join(" ").trim();

      if (headline) {
        return headline;
      }
    }

    const normalizedAddress = String(user?.address || "").trim();
    if (normalizedAddress) {
      const firstSegment = normalizedAddress
        .split(",")
        .map((part) => part.trim())
        .find(Boolean) || normalizedAddress;
      const lineMatch = firstSegment.match(/^(.*?\d+[\w\-/]*)/u);

      return lineMatch?.[1]?.trim() || firstSegment;
    }

    const normalizedName = String(user?.name || "").trim();
    const normalizedEmail = String(user?.email || "").trim();

    if (/gaston/i.test(normalizedName) || /gasto/i.test(normalizedEmail)) {
      return "Murillo 1121";
    }

    return "";
  }, [user]);
  const accountInitials = useMemo(() => {
    if (!user) {
      return "";
    }

    const firstName = String(user?.firstName || "").trim();
    const lastName = String(user?.lastName || "").trim();
    const rawName = String(user?.name || "").trim();
    const source = rawName || String(user?.email || "").trim();

    const fromNames = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();
    if (fromNames) {
      return fromNames.toUpperCase();
    }

    if (!source) {
      return "MC";
    }

    const cleaned = source
      .split("@")
      .shift()
      ?.replace(/[^\p{L}\p{N}\s]/gu, " ")
      ?.trim() || source;

    const parts = cleaned.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || parts[0]?.[1] || "";

    return `${first}${second}`.toUpperCase() || "MC";
  }, [user]);

  function handleAccountButtonClick() {
    if (!user) {
      onAccountClick();
      return;
    }

    setIsAccountMenuOpen((current) => !current);
  }

  function handleLogoutClick() {
    setIsLogoutConfirmOpen(true);
  }

  function handleLogoutConfirm() {
    setIsLogoutConfirmOpen(false);
    setIsAccountMenuOpen(false);
    onLogout();
  }

  function handleLogoutCancel() {
    setIsLogoutConfirmOpen(false);
  }

  function handleMyAccountClick() {
    setIsAccountMenuOpen(false);
    onMyAccountClick?.();
  }

  function handleOrdersClick() {
    setIsAccountMenuOpen(false);
    onOrdersClick?.();
  }

  function handleSearchChange(event) {
    const nextValue = event.target.value;
    onSearchInputChange(nextValue);
    setIsSuggestionsOpen(true);
  }

  function handleSearchSubmit(nextValue = searchValue) {
    onSearchSubmit(String(nextValue || "").trim());
    setIsSuggestionsOpen(false);
  }

  function handleSearchKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearchSubmit();
      return;
    }

    if (event.key === "Escape") {
      setIsSuggestionsOpen(false);
    }
  }

  function handleSearchFocus() {
    setIsSuggestionsOpen(true);
  }

  function handleSuggestionSelect(suggestion) {
    onSearchInputChange(suggestion);
    onSearchSubmit(suggestion);
    setIsSuggestionsOpen(false);
  }

  function handleClearSearch() {
    onSearchInputChange("");
    onSearchSubmit("");
    setIsSuggestionsOpen(false);
  }

  function handleLogoClick(event) {
    event.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
    // Also trigger home navigation if needed
    if (onGoHome) {
      onGoHome();
    }
  }

  return (
    <header className={`site-header${showHeader ? "" : " header-hidden"}`}>
      <div className="header-inner container">
        <div className="brand-block" aria-label="Marca">
          <a href="#" className="logo-link" aria-label="Ir al inicio" onClick={handleLogoClick}>
            <img
              className="logo-image"
              src="/fotos/logo/La boutique de la limpiezalogo.webp"
              alt="La Boutique de la Limpieza"
            />
          </a>
        </div>

        <div className="header-categories-block" aria-label="Categorías">
          <CategoriesMenu
            onSelectCategory={onSelectCategory}
            isAdmin={isAdmin}
            activeSection={activeSection}
            onGoHome={onGoHome}
            onGoPromotions={onGoPromotions}
            onGoAbout={onGoAbout}
            onGoAdmin={onGoAdmin}
            user={user}
            accountAddress={accountAddress}
            onAccountClick={onAccountClick}
            onLoginClick={onLoginClick}
            onMyAccountClick={onMyAccountClick}
            onOrdersClick={onOrdersClick}
            onLogout={onLogout}
            onFavoritesClick={onFavoritesClick}
            onRepeatOrder={onRepeatOrder}
            onSmartOrder={onSmartOrder}
            hasOrders={hasOrders}
          />
        </div>

        <div className="search-block" ref={searchRef}>
          <label className="sr-only" htmlFor="search-input">
            Buscar productos
          </label>
          <div className="search-wrap">
            <input
              id="search-input"
              type="search"
              placeholder="Buscar producto, marca o categoría"
              aria-label="Buscar productos de limpieza"
              autoComplete="off"
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onKeyDown={handleSearchKeyDown}
            />
            {searchValue ? (
              <button className="search-clear-btn" type="button" aria-label="Limpiar búsqueda" onClick={handleClearSearch}>
                ×
              </button>
            ) : null}
            <span className="search-separator" aria-hidden="true">|</span>
            <button className="search-btn" type="button" aria-label="Buscar" onClick={() => handleSearchSubmit()}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10.5 3a7.5 7.5 0 0 1 5.95 12.08l4.24 4.24a1 1 0 0 1-1.42 1.42l-4.24-4.24A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z" />
              </svg>
            </button>
          </div>

          {shouldShowSuggestions && (
            <ul className="search-suggestions" role="listbox" aria-label={suggestionsAriaLabel}>
              {activeSuggestions.map((suggestion) => (
                <li key={suggestion}>
                  <div className="search-suggestion-item">
                    <button
                      type="button"
                      className="search-suggestion-select"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      <span className="search-suggestion-icon" aria-hidden="true">
                        {isShowingRecentSearches ? (
                          <svg viewBox="0 0 24 24">
                            <path d="M12 2a10 10 0 1 0 9.95 11h-2.02A8 8 0 1 1 12 4a7.9 7.9 0 0 1 5.66 2.34L14 10h8V2l-2.92 2.92A9.93 9.93 0 0 0 12 2Zm-1 5v6.42l4.32 2.49 1-1.73L13 12.25V7h-2Z" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24">
                            <path d="M10.5 3a7.5 7.5 0 0 1 5.95 12.08l4.24 4.24a1 1 0 0 1-1.42 1.42l-4.24-4.24A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z" />
                          </svg>
                        )}
                      </span>
                      <span>{suggestion}</span>
                    </button>
                    {isShowingRecentSearches ? (
                      <button
                        type="button"
                        className="search-suggestion-remove"
                        aria-label={`Quitar ${suggestion} del historial`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveRecentSearch?.(suggestion);
                        }}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="actions-block" aria-label="Cuenta y acciones">
          <div className="account-menu-wrap" ref={accountMenuRef}>
            <button
              className={`action-item account-item ${user ? "is-logged" : "is-guest"}`}
              type="button"
              onClick={handleAccountButtonClick}
              aria-expanded={user ? isAccountMenuOpen : undefined}
              aria-haspopup={user ? "menu" : undefined}
            >
              {user ? (
                <>
                  <span className="account-chevron" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                      <path d="M7 10.5 12 15.5 17 10.5" />
                    </svg>
                  </span>
                  <span className="account-logged-label">Mi cuenta</span>
                  <span className="account-logged-icon" aria-hidden="true">
                    {accountInitials}
                  </span>
                  {avatarSource ? (
                    <img
                      className="account-avatar"
                      src={avatarSource}
                      alt="Foto de perfil"
                      loading="lazy"
                    />
                  ) : (
                    <span className="account-avatar account-avatar-initials" aria-hidden="true">
                      {accountInitials}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="account-guest-label">Iniciar sesión</span>
                  <span className="account-guest-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="12" />
                      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 1.8c-3.18 0-5.95 1.7-7.4 4.2h14.8c-1.45-2.5-4.22-4.2-7.4-4.2Z" fill="var(--white)" />
                    </svg>
                  </span>
                </>
              )}
            </button>

            {user && isAccountMenuOpen && (
              <div className="account-dropdown" role="menu" aria-label="Opciones de cuenta">
                <div className="account-dropdown-header" aria-hidden="true">
                  <span className="account-dropdown-badge">{accountInitials}</span>
                  <div>
                    <strong>{String(user?.name || "Mi cuenta")}</strong>
                    <small>{accountAddress ? `Dirección: ${accountAddress}` : String(user?.email || "Sesión iniciada")}</small>
                  </div>
                </div>

                <button
                  className="account-dropdown-item"
                  type="button"
                  role="menuitem"
                  onClick={handleMyAccountClick}
                >
                  <span className="account-dropdown-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="8" r="3" />
                      <path d="M5 19c1.2-3 3.8-4.6 7-4.6s5.8 1.6 7 4.6" />
                    </svg>
                  </span>
                  <span>Mi cuenta</span>
                </button>
                <button
                  className="account-dropdown-item"
                  type="button"
                  role="menuitem"
                  onClick={handleOrdersClick}
                >
                  <span className="account-dropdown-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="4" y="2" width="16" height="20" rx="2" />
                      <path d="M8 7h8M8 11h8M8 15h5" />
                    </svg>
                  </span>
                  <span>Mis pedidos</span>
                </button>
                <button
                  className="account-dropdown-item is-danger"
                  type="button"
                  role="menuitem"
                  onClick={handleLogoutClick}
                >
                  <span className="account-dropdown-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10" />
                      <path d="M14 8 19 12l-5 4" />
                      <path d="M19 12H9" />
                    </svg>
                  </span>
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>

          {isLogoutConfirmOpen && createPortal(
            <div className="logout-confirm-overlay" onClick={handleLogoutCancel}>
              <div className="logout-confirm-modal" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <p>¿Estás seguro de que querés cerrar sesión?</p>
                <div className="logout-confirm-actions">
                  <button type="button" className="logout-confirm-cancel" onClick={handleLogoutCancel}>Cancelar</button>
                  <button type="button" className="logout-confirm-accept" onClick={handleLogoutConfirm}>Cerrar sesión</button>
                </div>
              </div>
            </div>,
            document.body
          )}

          <button className="action-item icon-only favorites-item" type="button" aria-label="Favoritos" onClick={onFavoritesClick}>
            <span aria-hidden="true">★</span>
          </button>

          <button className="action-item icon-only cart-item" type="button" aria-label="Carrito" onClick={onCartClick}>
            <span className="cart-icon" aria-hidden="true">
              <svg viewBox="0 0 50 50">
                <path fill="#1877f2" d="M35 34H13c-.3 0-.6-.2-.8-.4s-.2-.6-.1-.9l1.9-4.8L12.1 10H6V8h7c.5 0 .9.4 1 .9l2 19c0 .2 0 .3-.1.5L14.5 32H36z"/>
                <path fill="#1877f2" d="m15.2 29l-.4-2L38 22.2V14H14v-2h25c.6 0 1 .4 1 1v10c0 .5-.3.9-.8 1zM36 40c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-24 6c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
              </svg>
            </span>
            <span className="cart-badge" aria-label={`${totalItems} productos en carrito`}>
              {totalItems}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
