import { useEffect, useMemo, useRef, useState } from "react";
import { categoryTree } from "./categoryTree";

const MOBILE_MENU_BREAKPOINT = 1100;

const limpiezaHogarIconPaths = {
  "Limpieza del hogar": "/fotos/icono%20limpieza%20del%20hogar/casa.png",
  "Pisos y Superficies": "/fotos/icono%20limpieza%20del%20hogar/pisosysuperficies.png",
  "Cuidado de Ropa": "/fotos/icono%20limpieza%20del%20hogar/cuidado%20de%20ropa.png",
  Cocina: "/fotos/icono%20limpieza%20del%20hogar/cocina.png",
  "Baño": "/fotos/icono%20limpieza%20del%20hogar/ba%C3%B1o.png",
  Ambientes: "/fotos/icono%20limpieza%20del%20hogar/ambientes.png",
  "Casa y Jardin": "/fotos/icono%20limpieza%20del%20hogar/casa%20y%20jardin.png"
};

const productosEspecificosIconPath = "/fotos/IconoClientesEspecificos/productosespecificos.png";

const productosEspecificosSubcategoryIconPaths = {
  Accesorios: "/fotos/IconoClientesEspecificos/accesorios.png",
  "Limpieza Profunda": "/fotos/IconoClientesEspecificos/limpiezaProfunda.png",
  Otros: "/fotos/IconoClientesEspecificos/otros.png"
};

const marcasIconPath = "/fotos/logos marcas/marcas.png";

function renderMenuPngIcon(src) {
  if (!src) {
    return null;
  }

  return <img src={src} alt="" aria-hidden="true" className="menu-item-icon-image menu-item-icon-image-limpieza" />;
}

const levelOneIcons = {
  "Todos los productos": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="6" height="6" rx="1.2" />
      <rect x="14" y="5" width="6" height="6" rx="1.2" />
      <rect x="4" y="13" width="6" height="6" rx="1.2" />
      <rect x="14" y="13" width="6" height="6" rx="1.2" />
    </svg>
  ),
  "Limpieza del hogar": renderMenuPngIcon(limpiezaHogarIconPaths["Limpieza del hogar"]),
  "Productos específicos": renderMenuPngIcon(productosEspecificosIconPath),
  Saphirus: (
    <img
      src="/fotos/iconos saphirus/logoS.png"
      alt=""
      aria-hidden="true"
      className="menu-item-icon-image menu-item-icon-image-saphirus-brand"
    />
  ),
  Marcas: renderMenuPngIcon(marcasIconPath)
};

const fallbackMenuIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

const saphirusIconFileByCategory = {
  aerosoles: "aerosol.png",
  aparatos: "aparato.png",
  difusores: "image.png",
  "difusores premium": "difusorpremium.png",
  home: "home.png",
  holder: "icono_holder_clean.svg",
  "holder sensaciones": "pruebaaaaa.png",
  sensaciones: "iconosensaciones.png",
  textil: "textil.png"
};

const shortcutIcons = {
  home: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10.5V19h11v-8.5" />
      <path d="M10 19v-4h4v4" />
    </svg>
  ),
  promotions: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="8" r="2" />
      <circle cx="16" cy="16" r="2" />
      <path d="M7 17 17 7" />
    </svg>
  ),
  about: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 19c1.2-3 3.8-4.6 7-4.6s5.8 1.6 7 4.6" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
      <path d="M5 10.5V16l7 3.5 7-3.5v-5.5" />
    </svg>
  )
};

const levelTwoKeywordIcons = [
  {
    keywords: ["catalogo", "todos", "ver todo"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2.2" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </svg>
    )
  },
  {
    keywords: ["oferta", "promo", "descuento", "2x1"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="8" cy="8" r="2" />
        <circle cx="16" cy="16" r="2" />
        <path d="M7 17 17 7" />
      </svg>
    )
  },
  {
    keywords: ["novedad", "nuevo", "lanzamiento"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 4 2 4.2L18.5 9l-3.2 3.1.8 4.4-4.1-2.2-4.1 2.2.8-4.4L5.5 9l4.5-.8L12 4Z" />
      </svg>
    )
  },
  {
    keywords: ["vendido", "top", "destacado"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 18h12" />
        <path d="M8 18V8" />
        <path d="M12 18V5" />
        <path d="M16 18v-7" />
      </svg>
    )
  },
  {
    keywords: ["envio", "rapido"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8h10v7H4Z" />
        <path d="M14 11h3l2 2v2h-5" />
        <circle cx="8" cy="17" r="1.6" />
        <circle cx="17" cy="17" r="1.6" />
      </svg>
    )
  },
  {
    keywords: ["piso", "superficie", "profunda", "vidrios"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 6h10" />
        <path d="M10 6v4l-2.2 3.2V18h8.4v-4.8L14 10V6" />
      </svg>
    )
  },
  {
    keywords: ["ropa", "textil", "lavado"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5h8" />
        <path d="M8.5 5v3l-2.5 2V19h12v-9l-2.5-2V5" />
        <circle cx="12" cy="13" r="2.2" />
      </svg>
    )
  },
  {
    keywords: ["cocina", "detergente", "lavavajillas", "horno"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="6" width="14" height="12" rx="1.8" />
        <path d="M9 9h6" />
        <path d="M9 12h4" />
      </svg>
    )
  },
  {
    keywords: ["bano", "higienico"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 7.5A2.5 2.5 0 0 1 10.5 5H12" />
        <path d="M6 11h12" />
        <path d="M7.5 11v3.2A4.5 4.5 0 0 0 12 18.7a4.5 4.5 0 0 0 4.5-4.5V11" />
      </svg>
    )
  },
  {
    keywords: ["ambiente", "fragancia", "difusor", "saphirus", "sensaciones"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4v8" />
        <path d="M9.2 11.3c0-2.2 1.5-3.8 2.8-5" />
        <path d="M14.8 11.3c0-2.2-1.5-3.8-2.8-5" />
        <path d="M7.5 14.2c0 2.8 2 4.9 4.5 6.3 2.5-1.4 4.5-3.5 4.5-6.3" />
      </svg>
    )
  },
  {
    keywords: ["jardin", "insecticida", "repelente"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 19V9" />
        <path d="M12 9c0-2.6 1.8-4.6 4.4-5" />
        <path d="M12 9c0-2.6-1.8-4.6-4.4-5" />
        <path d="M7 19h10" />
      </svg>
    )
  },
  {
    keywords: ["accesorio", "cepillo", "escobillon", "esponja", "guante", "pano", "trapo"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 8h10" />
        <path d="M9 8v8" />
        <path d="M15 8v8" />
        <path d="M7 16h10" />
      </svg>
    )
  },
  {
    keywords: ["otro", "varios", "broche", "fosforo", "vela"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <path d="M12 9v3" />
        <path d="M12 15h.01" />
      </svg>
    )
  },
  {
    keywords: ["marca", "ala", "ariel", "cif", "downy", "finish", "glade", "lysoform"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8.5 11.3 4h5.2L20 8.5v6.8L12 20l-8-4.7V8.5Z" />
        <path d="M9 10h6" />
      </svg>
    )
  }
];

function normalizeLabel(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getSaphirusIconPath(itemName) {
  const normalizedName = normalizeLabel(itemName);
  const iconFileName = saphirusIconFileByCategory[normalizedName];

  if (!iconFileName) {
    return null;
  }

  return `/fotos/iconos saphirus/${iconFileName}`;
}

function resolveLevelTwoIcon(itemName, levelOneName = "") {
  if (levelOneName === "Limpieza del hogar") {
    return renderMenuPngIcon(limpiezaHogarIconPaths[itemName]) || fallbackMenuIcon;
  }

  if (levelOneName === "Productos específicos") {
    return renderMenuPngIcon(productosEspecificosSubcategoryIconPaths[itemName]) || fallbackMenuIcon;
  }

  const normalizedName = normalizeLabel(itemName);

  const matchedIcon = levelTwoKeywordIcons.find(({ keywords }) =>
    keywords.some((keyword) => normalizedName.includes(keyword))
  );

  return matchedIcon?.icon || fallbackMenuIcon;
}

/**
 * Convert brand name to logo file path
 * Example: "Ariel" -> "/fotos/logos marcas/ariel.png"
 */
function getBrandLogoPath(brandName) {
  // Special case mappings for brands with different file names
  const specialCases = {
    "pato purific": "pato",
    "mr muscle": "mrmuscle",
    "media naranja": "medianaranja",
  };
  
  // Normalize brand name: lowercase, remove special chars, replace spaces with hyphens
  let normalized = brandName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s]+/g, "") // Remove special chars but keep spaces
    .trim();
  
  // Check for special cases first
  if (specialCases[normalized]) {
    normalized = specialCases[normalized];
  } else {
    // Replace spaces with nothing (no hyphens) for standard cases
    normalized = normalized.replace(/\s+/g, "");
  }
  
  return `/fotos/logos marcas/${normalized}.png`;
}

function normalizeItem(item) {
  if (typeof item === "string") {
    return { name: item, children: [] };
  }

  return {
    name: item.name,
    children: (item.children || []).map((child) => normalizeItem(child))
  };
}

function hasChildren(item) {
  return Boolean(item) && Array.isArray(item.children) && item.children.length > 0;
}

function MenuButton({
  item,
  isActive,
  onHover,
  onClick,
  showIcon = false,
  getIcon,
  customIconSrc = null,
  brandLogo = null,
  extraClassName = ""
}) {
  const itemIcon = getIcon?.(item) || fallbackMenuIcon;
  const menuItemClassName = `menu-item ${isActive ? "is-active" : ""} ${extraClassName}`.trim();

  return (
    <button
      type="button"
      className={menuItemClassName}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onClick}
    >
      <span className="menu-item-main">
        {customIconSrc ? (
          <span className="menu-item-icon" aria-hidden="true">
            <img
              src={customIconSrc}
              alt=""
              aria-hidden="true"
              className="menu-item-icon-image menu-item-icon-image-saphirus"
            />
          </span>
        ) : brandLogo ? (
          <img 
            src={brandLogo} 
            alt={`${item.name} logo`}
            className="brand-logo-icon"
            onError={(e) => {
              // Hide image if it fails to load
              e.target.style.display = 'none';
            }}
          />
        ) : showIcon && (
          <span className="menu-item-icon" aria-hidden="true">
            {itemIcon}
          </span>
        )}
        <span className="menu-item-label">{item.name}</span>
      </span>
      {hasChildren(item) && <span className="chevron">›</span>}
    </button>
  );
}

export default function CategoriesMenu({
  onSelectCategory,
  isAdmin,
  activeSection,
  onGoHome,
  onGoPromotions,
  onGoAbout,
  onGoAdmin,
  user,
  onAccountClick,
  onMyAccountClick,
  onLogout
}) {
  const menuRef = useRef(null);
  const previousHeaderZIndexRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [backdropTop, setBackdropTop] = useState(0);
  const [activeLevelOneIndex, setActiveLevelOneIndex] = useState(-1);
  const [activeLevelTwoIndex, setActiveLevelTwoIndex] = useState(-1);
  const [mobilePath, setMobilePath] = useState([]);
  const [mobileRootView, setMobileRootView] = useState("home");
  const [mobileSlideDirection, setMobileSlideDirection] = useState("forward");
  const [mobileViewAnimationKey, setMobileViewAnimationKey] = useState(0);
  const [hideLevelThreeScrollHint, setHideLevelThreeScrollHint] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(`(max-width: ${MOBILE_MENU_BREAKPOINT}px)`).matches;
  });

  const levelOneItems = useMemo(() => categoryTree.map((item) => normalizeItem(item)), []);

  const activeLevelOne = activeLevelOneIndex >= 0 ? levelOneItems[activeLevelOneIndex] : null;
  const levelTwoItems = activeLevelOne?.children || [];
  const activeLevelTwo = activeLevelTwoIndex >= 0 ? levelTwoItems[activeLevelTwoIndex] : null;
  const levelThreeItems = hasChildren(activeLevelTwo) ? activeLevelTwo.children : [];
  const hasDenseLevelThreeItems = levelThreeItems.length >= 7;
  const isBrandsLayout =
    activeLevelOne?.name === "Marcas" && levelTwoItems.length > 0 && !levelThreeItems.length;
  const isSaphirusLayout =
    activeLevelOne?.name === "Saphirus" && levelTwoItems.length > 0 && !levelThreeItems.length;

  const mobileLevelState = useMemo(() => {
    let currentItems = levelOneItems;
    let currentNode = null;

    for (const pathIndex of mobilePath) {
      currentNode = currentItems[pathIndex] || null;
      currentItems = currentNode?.children || [];
    }

    return {
      depth: mobilePath.length,
      currentNode,
      currentItems
    };
  }, [levelOneItems, mobilePath]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_MENU_BREAKPOINT}px)`);
    const onMediaQueryChange = (event) => {
      setIsCompactViewport(event.matches);
    };

    setIsCompactViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", onMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener("change", onMediaQueryChange);
    };
  }, []);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
        setActiveLevelOneIndex(-1);
        setActiveLevelTwoIndex(-1);
        setMobilePath([]);
        setMobileRootView("home");
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setActiveLevelOneIndex(-1);
        setActiveLevelTwoIndex(-1);
        setMobilePath([]);
        setMobileRootView("home");
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function syncBackdropTop() {
      const navBarElement = document.querySelector(".nav-bar");
      const navBottom = navBarElement?.getBoundingClientRect()?.bottom || 0;
      const headerElement = menuRef.current?.closest(".site-header");
      const headerBottom = headerElement?.getBoundingClientRect()?.bottom || 0;
      const triggerBottom = menuRef.current?.getBoundingClientRect()?.bottom || 0;

      setBackdropTop(Math.max(navBottom, headerBottom, triggerBottom, 0));
    }

    const headerElement = menuRef.current?.closest(".site-header");
    if (headerElement) {
      previousHeaderZIndexRef.current = headerElement.style.zIndex;
      headerElement.style.zIndex = "10001";
    }

    syncBackdropTop();
    window.addEventListener("resize", syncBackdropTop);
    window.addEventListener("scroll", syncBackdropTop, { passive: true });

    return () => {
      window.removeEventListener("resize", syncBackdropTop);
      window.removeEventListener("scroll", syncBackdropTop);

      if (headerElement) {
        headerElement.style.zIndex = previousHeaderZIndexRef.current || "";
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    setHideLevelThreeScrollHint(false);
  }, [isOpen, activeLevelOneIndex, activeLevelTwoIndex, hasDenseLevelThreeItems]);

  function toggleMenu() {
    setIsOpen((current) => !current);
    setActiveLevelOneIndex(-1);
    setActiveLevelTwoIndex(-1);
    setMobilePath([]);
    setMobileRootView("home");
    setMobileSlideDirection("forward");
    setMobileViewAnimationKey(0);
  }

  function onLevelOneHover(index) {
    setActiveLevelOneIndex(index);
    setActiveLevelTwoIndex(-1);
  }

  function handleCategorySelection(categoryName) {
    if (typeof onSelectCategory === "function") {
      onSelectCategory(categoryName);
    }

    setIsOpen(false);
    setActiveLevelOneIndex(-1);
    setActiveLevelTwoIndex(-1);
    setMobilePath([]);
    setMobileRootView("home");
  }

  function getMobileItemIcon(item, depth) {
    if (depth === 0) {
      return levelOneIcons[item.name] || fallbackMenuIcon;
    }

    if (depth === 1) {
      return resolveLevelTwoIcon(item.name, mobileLevelState.currentNode?.name || "");
    }

    return fallbackMenuIcon;
  }

  function handleMobileItemClick(item, index) {
    if (hasChildren(item)) {
      setMobileSlideDirection("forward");
      setMobileViewAnimationKey((currentKey) => currentKey + 1);
      setMobilePath((currentPath) => [...currentPath, index]);
      return;
    }

    handleCategorySelection(item.name);
  }

  function handleMobileBack() {
    if (mobilePath.length === 0) {
      if (mobileRootView === "categories") {
        setMobileSlideDirection("backward");
        setMobileViewAnimationKey((currentKey) => currentKey + 1);
        setMobileRootView("home");
        return;
      }

      toggleMenu();
      return;
    }

    setMobileSlideDirection("backward");
    setMobileViewAnimationKey((currentKey) => currentKey + 1);
    setMobilePath((currentPath) => currentPath.slice(0, -1));
  }

  function handleShortcutClick(onNavigate) {
    if (typeof onNavigate === "function") {
      onNavigate();
    }

    setIsOpen(false);
    setActiveLevelOneIndex(-1);
    setActiveLevelTwoIndex(-1);
    setMobilePath([]);
    setMobileRootView("home");
  }

  function handleLevelThreeScroll(event) {
    const shouldHideHint = event.currentTarget.scrollTop > 10;

    setHideLevelThreeScrollHint((currentValue) => {
      if (currentValue === shouldHideHint) {
        return currentValue;
      }

      return shouldHideHint;
    });
  }

  const shortcutItems = [
    {
      id: "home",
      label: "Inicio",
      icon: shortcutIcons.home,
      isVisible: true,
      isActive: activeSection === "home",
      onClick: () => handleShortcutClick(onGoHome)
    },
    {
      id: "promotions",
      label: "Promociones",
      icon: shortcutIcons.promotions,
      isVisible: true,
      isActive: activeSection === "promotions",
      onClick: () => handleShortcutClick(onGoPromotions)
    },
    {
      id: "about",
      label: "Sobre Nosotros",
      icon: shortcutIcons.about,
      isVisible: true,
      isActive: activeSection === "about",
      onClick: () => handleShortcutClick(onGoAbout)
    },
    {
      id: "admin",
      label: "Admin",
      icon: shortcutIcons.admin,
      isVisible: Boolean(isAdmin),
      isActive: activeSection === "admin",
      onClick: () => handleShortcutClick(onGoAdmin)
    }
  ].filter((item) => item.isVisible);

  const isMobileCategoriesView = mobileRootView === "categories" || mobileLevelState.depth > 0;
  const mobileHeaderTitle = isMobileCategoriesView
    ? mobileLevelState.depth > 0
      ? mobileLevelState.currentNode?.name || "Categorías"
      : "Categorías"
    : "";

  return (
    <div className={`categories-wrapper ${isOpen ? "is-open" : ""}`} ref={menuRef}>
      <button
        className="categories-toggle"
        type="button"
        aria-expanded={isOpen}
        onClick={toggleMenu}
      >
        <span className="hamburger" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="categories-toggle-label">Categorías</span>
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="categories-backdrop"
            aria-label="Cerrar menú de categorías"
            onClick={toggleMenu}
            style={isCompactViewport ? { top: 0 } : { top: `${backdropTop}px` }}
          />

          {isCompactViewport ? (
            <section className="mega-menu mega-menu-mobile" aria-label="Menú de categorías">
              <header className="mega-mobile-header">
                <button type="button" className="mega-mobile-back" onClick={handleMobileBack}>
                  <span className="mega-mobile-back-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M3.5 12h17" />
                      <path d="M9.5 6 3.5 12l6 6" />
                    </svg>
                  </span>
                  {!isMobileCategoriesView && <span>Volver</span>}
                </button>
                <strong>{mobileHeaderTitle}</strong>
                {isMobileCategoriesView ? (
                  <button
                    type="button"
                    className="mega-mobile-close"
                    onClick={toggleMenu}
                    aria-label="Cerrar menú"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                ) : null}
              </header>

              <div
                key={mobileViewAnimationKey}
                className={`mega-mobile-list ${mobileSlideDirection === "backward" ? "is-backward" : "is-forward"}`}
                role="menu"
              >
                {mobileRootView === "home" && mobileLevelState.depth === 0 && shortcutItems.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="menu-item menu-item-shortcut menu-item-categories-root"
                      role="menuitem"
                      onClick={() => {
                        setMobileSlideDirection("forward");
                        setMobileViewAnimationKey((currentKey) => currentKey + 1);
                        setMobileRootView("categories");
                        setMobilePath([]);
                      }}
                    >
                      <span className="menu-item-main">
                        <span className="menu-item-icon" aria-hidden="true">
                          {levelOneIcons["Todos los productos"] || fallbackMenuIcon}
                        </span>
                        <span className="menu-item-label">Categorías</span>
                      </span>
                      <span className="chevron">›</span>
                    </button>

                    <div className="mega-mobile-shortcuts-title">Secciones</div>
                    {shortcutItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`menu-item menu-item-shortcut menu-item-shortcut-link ${item.isActive ? "is-active" : ""}`}
                        role="menuitem"
                        onClick={item.onClick}
                      >
                        <span className="menu-item-main">
                          <span className="menu-item-icon" aria-hidden="true">
                            {item.icon || fallbackMenuIcon}
                          </span>
                          <span className="menu-item-label">{item.label}</span>
                        </span>
                      </button>
                    ))}
                    <div className="mega-mobile-list-divider" aria-hidden="true" />
                  </>
                )}

                {(mobileRootView === "categories" || mobileLevelState.depth > 0) && mobileLevelState.currentItems.map((item, index) => (
                  <button
                    key={item.name}
                    type="button"
                    className="menu-item"
                    role="menuitem"
                    onClick={() => handleMobileItemClick(item, index)}
                  >
                    <span className="menu-item-main">
                      <span className="menu-item-icon" aria-hidden="true">
                        {mobileLevelState.depth === 1 && mobileLevelState.currentNode?.name === "Saphirus" ? (
                          <img
                            src={getSaphirusIconPath(item.name) || ""}
                            alt=""
                            aria-hidden="true"
                            className="menu-item-icon-image menu-item-icon-image-saphirus"
                          />
                        ) : (
                          getMobileItemIcon(item, mobileLevelState.depth)
                        )}
                      </span>
                      <span className="menu-item-label">{item.name}</span>
                    </span>
                    {hasChildren(item) && <span className="chevron">›</span>}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="mega-menu" aria-label="Menú de categorías">
              <div className="mega-menu-inner">
                <div className="mega-column level-one">
                  <div className="mega-shortcuts-title">Categorías</div>

                  {levelOneItems.map((item, index) => (
                    <MenuButton
                      key={item.name}
                      item={item}
                      isActive={index === activeLevelOneIndex}
                      onHover={() => onLevelOneHover(index)}
                      onClick={() => handleCategorySelection(item.name)}
                      showIcon
                      getIcon={(levelOneItem) => levelOneIcons[levelOneItem.name]}
                    />
                  ))}
                </div>

                {activeLevelOne && hasChildren(activeLevelOne) && (
                  <div className={`mega-column level-two ${isBrandsLayout ? "is-wide is-multi-column" : ""}`}>
                    {levelTwoItems.map((item, index) => (
                      <MenuButton
                        key={item.name}
                        item={item}
                        isActive={index === activeLevelTwoIndex}
                        onHover={() => setActiveLevelTwoIndex(index)}
                        onClick={() => handleCategorySelection(item.name)}
                        showIcon={!isBrandsLayout}
                        getIcon={(levelTwoItem) => resolveLevelTwoIcon(levelTwoItem.name, activeLevelOne?.name || "")}
                        customIconSrc={isSaphirusLayout ? getSaphirusIconPath(item.name) : null}
                        brandLogo={isBrandsLayout ? getBrandLogoPath(item.name) : null}
                        extraClassName={
                          isBrandsLayout
                            ? "menu-item-brand"
                            : isSaphirusLayout
                              ? "menu-item-saphirus"
                              : ""
                        }
                      />
                    ))}
                  </div>
                )}

                {levelThreeItems.length > 0 && (
                  <div
                    className={`mega-column level-three ${hasDenseLevelThreeItems ? "has-scroll-hint" : ""}`}
                    onScroll={handleLevelThreeScroll}
                  >
                    {hasDenseLevelThreeItems && (
                      <div
                        className={`mega-column-scroll-hint ${hideLevelThreeScrollHint ? "is-hidden" : ""}`}
                        aria-hidden="true"
                      >
                        Desliza para ver mas
                      </div>
                    )}
                    {levelThreeItems.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        className="menu-item"
                        onClick={() => handleCategorySelection(item.name)}
                      >
                        <span className="menu-item-label">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
