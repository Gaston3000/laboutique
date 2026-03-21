import { useEffect, useMemo, useRef, useState } from "react";
import { categoryTree } from "./categoryTree";

const MOBILE_MENU_BREAKPOINT = 1000;

const limpiezaHogarIconPaths = {
  "Limpieza del hogar": "/fotos/icono%20limpieza%20del%20hogar/casa.webp",
  "Pisos y Superficies": "/fotos/icono%20limpieza%20del%20hogar/pisosysuperficies.webp",
  "Cuidado de Ropa": "/fotos/icono%20limpieza%20del%20hogar/cuidado%20de%20ropa.webp",
  Cocina: "/fotos/icono%20limpieza%20del%20hogar/cocina.webp",
  "Baño": "/fotos/icono%20limpieza%20del%20hogar/ba%C3%B1o.webp",
  Ambientes: "/fotos/icono%20limpieza%20del%20hogar/ambientes.webp",
  "Casa y Jardin": "/fotos/icono%20limpieza%20del%20hogar/casa%20y%20jardin.webp"
};

const productosEspecificosIconPath = "/fotos/IconoClientesEspecificos/productosespecificos.webp";

const productosEspecificosSubcategoryIconPaths = {
  Accesorios: "/fotos/IconoClientesEspecificos/accesorios.webp",
  "Limpieza Profunda": "/fotos/IconoClientesEspecificos/limpiezaProfunda.webp",
  Otros: "/fotos/IconoClientesEspecificos/otros.webp"
};

const marcasIconPath = "/fotos/logos marcas/marcas.webp";

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
      src="/fotos/iconos saphirus/logoS.webp"
      alt=""
      aria-hidden="true"
      className="menu-item-icon-image menu-item-icon-image-saphirus-brand"
    />
  ),
  Marcas: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.6 3.1 21 11.5a1 1 0 0 1 0 1.4l-7.1 7.1a1 1 0 0 1-1.4 0L3 11.5V4.1a1 1 0 0 1 1-1h8.6Z" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
  )
};

const fallbackMenuIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

const saphirusIconFileByCategory = {
  aerosoles: "aerosol.webp",
  aparatos: "aparato.webp",
  difusores: "image.webp",
  "difusores premium": "difusorpremium.webp",
  home: "home.webp",
  holder: "icono_holder_clean.svg",
  "holder sensaciones": "pruebaaaaa.webp",
  sensaciones: "iconosensaciones.webp",
  textil: "textil.webp"
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
  ),
  favorites: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.75 14.85 8l5.9.85-4.27 4.1 1.01 5.8L12 16.03 6.51 18.75l1-5.8-4.26-4.1L9.15 8 12 2.75Z" />
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
 * Example: "Ariel" -> "/fotos/logos marcas/ariel.webp"
 */
function getBrandLogoPath(brandName) {
  // Special case mappings for brands with different file names
  const specialCases = {
    "pato purific": "pato",
    "mr muscle": "mrmuscle",
    "mr musculo": "mrmuscle",
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
  
  return `/fotos/logos marcas/${normalized}.webp`;
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
  accountAddress,
  onAccountClick,
  onLoginClick,
  onMyAccountClick,
  onOrdersClick,
  onLogout,
  onFavoritesClick,
  onRepeatOrder,
  onSmartOrder,
  hasOrders
}) {
  const menuRef = useRef(null);
  const previousHeaderZIndexRef = useRef(null);
  const [isMobileAccountOpen, setIsMobileAccountOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
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
    let parentNode = null;

    for (const pathIndex of mobilePath) {
      parentNode = currentNode;
      currentNode = currentItems[pathIndex] || null;
      currentItems = currentNode?.children || [];
    }

    return {
      depth: mobilePath.length,
      currentNode,
      parentNode,
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
        closeMenu();
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        closeMenu();
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
      headerElement.style.willChange = "auto";
      headerElement.style.transform = "none";
    }

    syncBackdropTop();
    window.addEventListener("resize", syncBackdropTop);
    window.addEventListener("scroll", syncBackdropTop, { passive: true });

    return () => {
      window.removeEventListener("resize", syncBackdropTop);
      window.removeEventListener("scroll", syncBackdropTop);

      if (headerElement) {
        headerElement.style.zIndex = previousHeaderZIndexRef.current || "";
        headerElement.style.willChange = "";
        headerElement.style.transform = "";
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    setHideLevelThreeScrollHint(false);
  }, [isOpen, activeLevelOneIndex, activeLevelTwoIndex, hasDenseLevelThreeItems]);

  const closeMenuRef = useRef(null);
  closeMenuRef.current = () => {
    if (!isOpen || isClosing) return;
    setIsClosing(true);
  };

  function closeMenu() {
    closeMenuRef.current();
  }

  function handleCloseAnimationEnd() {
    setIsClosing(false);
    setIsOpen(false);
    setActiveLevelOneIndex(-1);
    setActiveLevelTwoIndex(-1);
    setMobilePath([]);
    setMobileRootView("home");
    setMobileSlideDirection("forward");
    setMobileViewAnimationKey(0);
    setIsMobileAccountOpen(false);
  }

  function toggleMenu() {
    if (isOpen) {
      closeMenu();
    } else {
      setIsOpen(true);
    }
    setActiveLevelOneIndex(-1);
    setActiveLevelTwoIndex(-1);
    setMobilePath([]);
    setMobileRootView("home");
    setMobileSlideDirection("forward");
    setMobileViewAnimationKey(0);
    setIsMobileAccountOpen(false);
  }

  function onLevelOneHover(index) {
    setActiveLevelOneIndex(index);
    setActiveLevelTwoIndex(-1);
  }

  function handleCategorySelection(categoryName) {
    if (typeof onSelectCategory === "function") {
      onSelectCategory(categoryName);
    }

    closeMenu();
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

    closeMenu();
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
      id: "repeat-order",
      label: "Repetir pedido",
      icon: (
        <img src="/fotos/iconos%20general/uim--repeat.svg" alt="" width="20" height="20" aria-hidden="true" />
      ),
      isVisible: Boolean(user && hasOrders),
      isActive: false,
      onClick: () => handleShortcutClick(onRepeatOrder)
    },
    {
      id: "smart-order",
      label: "Pedido Inteligente",
      icon: (
        <img src="/fotos/iconos%20general/lineicons--open-ai.svg" alt="" width="20" height="20" aria-hidden="true" />
      ),
      isVisible: true,
      isActive: false,
      onClick: () => handleShortcutClick(onSmartOrder)
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
      id: "favorites",
      label: "Favoritos",
      icon: shortcutIcons.favorites,
      isVisible: !isCompactViewport,
      isActive: false,
      onClick: () => handleShortcutClick(onFavoritesClick)
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

  const isMobileBrandsView = mobileLevelState.depth === 1 && mobileLevelState.currentNode?.name === "Marcas";
  const isMobileCategoriesView = mobileRootView === "categories" || mobileLevelState.depth > 0;
  const mobileHeaderTitle = isMobileCategoriesView
    ? mobileLevelState.depth > 0
      ? mobileLevelState.currentNode?.name || "Categorías"
      : "Categorías"
    : "";

  const mobileHeaderIcon = (() => {
    if (!isMobileCategoriesView || mobileLevelState.depth === 0) return null;
    const node = mobileLevelState.currentNode;
    if (!node) return null;

    if (mobileLevelState.depth === 1) {
      return levelOneIcons[node.name] || fallbackMenuIcon;
    }

    if (mobileLevelState.depth === 2) {
      const parentName = mobileLevelState.parentNode?.name || "";
      if (parentName === "Saphirus") {
        const src = getSaphirusIconPath(node.name);
        return src
          ? <img src={src} alt="" aria-hidden="true" className="menu-item-icon-image menu-item-icon-image-saphirus" />
          : fallbackMenuIcon;
      }
      return resolveLevelTwoIcon(node.name, parentName);
    }

    return fallbackMenuIcon;
  })();

  const mobileAddressSummary = useMemo(() => {
    if (!user) return null;
    const primaryAddress = Array.isArray(user?.addressBook)
      ? user.addressBook.find((entry) => entry?.id === user?.primaryAddressId) || user.addressBook[0]
      : null;

    if (primaryAddress) {
      const street = String(primaryAddress.street || "").trim();
      const height = String(primaryAddress.height || "").trim();
      const postalCode = String(primaryAddress.postalCode || "").trim();
      const city = String(primaryAddress.city || "").trim();
      const headline = [street, height].filter(Boolean).join(" ");
      const cpPart = postalCode ? `CP${postalCode}` : "";
      const parts = [headline, cpPart, city].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }

    if (accountAddress) return accountAddress;
    return null;
  }, [user, accountAddress]);

  function handleMobileAddressClick() {
    if (user) {
      onMyAccountClick?.();
    } else {
      onAccountClick?.();
    }
    closeMenu();
  }

  return (
    <div className={`categories-wrapper ${isOpen ? "is-open" : ""}${isClosing ? " is-closing" : ""}`} ref={menuRef}>
      <button
        className="categories-toggle"
        type="button"
        aria-expanded={isOpen && !isClosing}
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
            className={`categories-backdrop${isClosing ? " is-closing" : ""}`}
            aria-label="Cerrar menú de categorías"
            onClick={toggleMenu}
            style={isCompactViewport ? { top: 0 } : { top: `${backdropTop}px` }}
          />

          {isCompactViewport ? (
            <section
              className={`mega-menu mega-menu-mobile${isClosing ? " is-closing" : ""}`}
              aria-label="Menú de categorías"
              onAnimationEnd={isClosing ? handleCloseAnimationEnd : undefined}
            >
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
                <strong className="mega-mobile-header-title">
                  {mobileHeaderIcon && (
                    <span className="mega-mobile-header-icon" aria-hidden="true">
                      {mobileHeaderIcon}
                    </span>
                  )}
                  {mobileHeaderTitle}
                </strong>
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

              {mobileRootView === "home" && mobileLevelState.depth === 0 && (
                <div className="mega-mobile-account-section">
                  {user ? (() => {
                    const rawName = String(user.firstName || user.name?.split(" ")[0] || "").trim() || "usuario";
                    const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                    const firstInitial = String(user.firstName || user.name || "").trim().charAt(0).toUpperCase();
                    const lastInitial = String(user.lastName || "").trim().charAt(0).toUpperCase()
                      || String(user.name || "").trim().split(/\s+/)[1]?.charAt(0)?.toUpperCase() || "";
                    const initials = (firstInitial + lastInitial) || "U";

                    return (
                      <>
                        <button
                          type="button"
                          className="mega-mobile-account-greeting"
                          onClick={() => setIsMobileAccountOpen((prev) => !prev)}
                        >
                          <span className="mega-mobile-account-avatar is-logged" aria-hidden="true">
                            <span className="mega-mobile-account-initials">{initials}</span>
                          </span>
                          <span className="mega-mobile-account-text">
                            <strong>¡Hola, {displayName}!</strong>
                            <span className="mega-mobile-account-email">{String(user.email || "").trim()}</span>
                          </span>
                          <span className={`mega-mobile-account-arrow${isMobileAccountOpen ? " is-open" : ""}`} aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" /></svg>
                          </span>
                        </button>
                        <div className={`mega-mobile-account-submenu${isMobileAccountOpen ? " is-open" : ""}`}>
                          <button
                            type="button"
                            className="mega-mobile-account-submenu-item"
                            onClick={() => { closeMenu(); onMyAccountClick?.(); }}
                          >
                            <span className="mega-mobile-account-submenu-icon" aria-hidden="true">
                              <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="8" r="3" />
                                <path d="M5 19c1.2-3 3.8-4.6 7-4.6s5.8 1.6 7 4.6" />
                              </svg>
                            </span>
                            <span>Mi cuenta</span>
                            <span className="mega-mobile-account-submenu-chevron" aria-hidden="true">›</span>
                          </button>
                          <button
                            type="button"
                            className="mega-mobile-account-submenu-item"
                            onClick={() => { closeMenu(); onOrdersClick?.(); }}
                          >
                            <span className="mega-mobile-account-submenu-icon" aria-hidden="true">
                              <svg viewBox="0 0 24 24">
                                <rect x="4" y="3" width="16" height="18" rx="2" />
                                <path d="M8 7h8" />
                                <path d="M8 11h8" />
                                <path d="M8 15h5" />
                              </svg>
                            </span>
                            <span>Mis pedidos</span>
                            <span className="mega-mobile-account-submenu-chevron" aria-hidden="true">›</span>
                          </button>
                          <button
                            type="button"
                            className="mega-mobile-account-submenu-item"
                            onClick={() => { closeMenu(); onFavoritesClick?.(); }}
                          >
                            <span className="mega-mobile-account-submenu-icon" aria-hidden="true">
                              <svg viewBox="0 0 24 24">
                                <path d="M12 2.75 14.85 8l5.9.85-4.27 4.1 1.01 5.8L12 16.03 6.51 18.75l1-5.8-4.26-4.1L9.15 8 12 2.75Z" />
                              </svg>
                            </span>
                            <span>Favoritos</span>
                            <span className="mega-mobile-account-submenu-chevron" aria-hidden="true">›</span>
                          </button>
                        </div>
                      </>
                    );
                  })() : (
                    <>
                      <div className="mega-mobile-account-guest">
                        <span className="mega-mobile-account-avatar" aria-hidden="true">
                          <svg viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="23" />
                            <circle cx="24" cy="18" r="7" fill="#fff" />
                            <path d="M10 40c2-6.5 7.8-10 14-10s12 3.5 14 10" fill="#fff" />
                          </svg>
                        </span>
                        <span className="mega-mobile-account-text">
                          <strong>¡Hola!</strong>
                          <span>Ingresá a tu cuenta o registrate</span>
                        </span>
                      </div>
                      <div className="mega-mobile-account-actions">
                        <button
                          type="button"
                          className="mega-mobile-account-btn mega-mobile-account-btn-outline"
                          onClick={() => { closeMenu(); onAccountClick?.(); }}
                        >
                          Registrarme
                        </button>
                        <button
                          type="button"
                          className="mega-mobile-account-btn mega-mobile-account-btn-solid"
                          onClick={() => { closeMenu(); onLoginClick?.(); }}
                        >
                          Ingresar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {mobileRootView === "home" && mobileLevelState.depth === 0 && (
                <button type="button" className="mega-mobile-shipping" onClick={handleMobileAddressClick}>
                  <span className="mega-mobile-shipping-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M1 12.5h1m0 0V11a1 1 0 0 1 1-1h9V6a1 1 0 0 1 1-1h3.28a1 1 0 0 1 .8.4l3.52 4.7a1 1 0 0 1 .2.6V17a1 1 0 0 1-1 1h-1m-16.8-5.5V17a1 1 0 0 0 1 1h1.8" />
                      <circle cx="7.5" cy="18.5" r="1.5" />
                      <circle cx="17.5" cy="18.5" r="1.5" />
                      <path d="M9 18h6.5" />
                    </svg>
                  </span>
                  <span className="mega-mobile-shipping-info">
                    {user && mobileAddressSummary ? (
                      <>
                        <span className="mega-mobile-shipping-label">
                          Envío a <strong>{mobileAddressSummary}</strong>
                        </span>
                        <span className="mega-mobile-shipping-action">Cambiar dirección</span>
                      </>
                    ) : user ? (
                      <>
                        <span className="mega-mobile-shipping-label">Agregá tu dirección de envío</span>
                        <span className="mega-mobile-shipping-action">Configurar dirección</span>
                      </>
                    ) : (
                      <>
                        <span className="mega-mobile-shipping-label">Elegí tu zona de envío</span>
                        <span className="mega-mobile-shipping-action">Iniciar sesión</span>
                      </>
                    )}
                  </span>
                </button>
              )}

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

                {(mobileRootView === "categories" || mobileLevelState.depth > 0) && (
                  isMobileBrandsView ? (
                    <div className="mega-mobile-brands-grid">
                      {mobileLevelState.currentItems.map((item, index) => (
                        <button
                          key={item.name}
                          type="button"
                          className="mega-mobile-brand-card"
                          role="menuitem"
                          onClick={() => handleMobileItemClick(item, index)}
                        >
                          <img
                            src={getBrandLogoPath(item.name)}
                            alt={`${item.name} logo`}
                            className="mega-mobile-brand-logo"
                            onError={(e) => { e.target.style.opacity = "0"; }}
                          />
                          <span className="mega-mobile-brand-name">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    mobileLevelState.currentItems.map((item, index) => (
                      <button
                        key={item.name}
                        type="button"
                        className="menu-item"
                        role="menuitem"
                        onClick={() => handleMobileItemClick(item, index)}
                      >
                        <span className="menu-item-main">
                          {mobileLevelState.depth < 2 && (
                            mobileLevelState.depth === 1 && mobileLevelState.currentNode?.name === "Marcas" ? (
                              <img
                                src={getBrandLogoPath(item.name)}
                                alt={`${item.name} logo`}
                                className="brand-logo-icon"
                                onError={(e) => { e.target.style.display = "none"; }}
                              />
                            ) : (
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
                            )
                          )}
                          <span className="menu-item-label">{item.name}</span>
                        </span>
                        {hasChildren(item) && <span className="chevron">›</span>}
                      </button>
                    ))
                  )
                )}
              </div>
            </section>
          ) : (
            <section
              className={`mega-menu${isClosing ? " is-closing" : ""}`}
              aria-label="Menú de categorías"
              onAnimationEnd={isClosing ? handleCloseAnimationEnd : undefined}
            >
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
