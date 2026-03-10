const categoryTree = [
  {
    name: "Todos los productos",
    children: [
      {
        name: "Ver todo el catálogo",
        children: ["Todos los artículos", "Productos destacados", "Nuevos ingresos"]
      },
      {
        name: "Ofertas destacadas",
        children: ["2x1", "Descuentos por volumen", "Promos del mes"]
      },
      {
        name: "Novedades",
        children: ["Nuevos lanzamientos", "Nuevas marcas", "Nuevas fragancias"]
      },
      "Más vendidos",
      "Productos con envío rápido"
    ]
  },
  {
    name: "Limpieza del hogar",
    children: [
      {
        name: "Pisos y Superficies",
        children: [
          "Amoniaco",
          "Ceras",
          "Líquidos de Piso",
          "Limpia Vidrios",
          "Secadores de Piso",
          "Secadores de Vidrios"
        ]
      },
      {
        name: "Cuidado de Ropa",
        children: ["Aprestos", "Jabones Ropa", "Quitamanchas Ropa", "Suavizantes"]
      },
      {
        name: "Cocina",
        children: ["Detergentes y Lavavajillas", "Limpia Hornos", "Rollos de Cocina"]
      },
      {
        name: "Baño",
        children: ["Canasta", "Higiénico"]
      },
      {
        name: "Ambientes",
        children: ["Antihumedad", "Saphirus"]
      },
      {
        name: "Casa y Jardin",
        children: ["Insecticidas", "Repelente de Insectos"]
      }
    ]
  },
  {
    name: "Productos específicos",
    children: [
      {
        name: "Accesorios",
        children: [
          "Bolsas de Residuo",
          "Cepillos",
          "Escobillones",
          "Esponjas",
          "Guantes",
          "Paños",
          "Palos",
          "Plásticos",
          "Plumeros",
          "Sopapas",
          "Trapos"
        ]
      },
      {
        name: "Limpieza Profunda",
        children: ["Limpia Tapizados", "Quitamanchas En Aerosol"]
      },
      {
        name: "Otros",
        children: ["Broches", "Fósforos", "Pañuelos", "Velas"]
      }
    ]
  },
  {
    name: "Saphirus",
    children: [
      "Aparatos",
      "Difusores",
      "Difusores Premium",
      "Home",
      "Holder Sensaciones",
      "Sensaciones",
      "Textil"
    ]
  },
  {
    name: "Marcas",
    children: [
      "Ala",
      "Ariel",
      "Ayudin",
      "Blem",
      "Cif",
      "Comfort",
      "Downy",
      "Drive",
      "Finish",
      "Florida",
      "Fuyi",
      "Glade",
      "Harpic",
      "Lysoform",
      "Magistral",
      "Make",
      "OFF!",
      "Pato Purific",
      "Poett",
      "Procenex",
      "Qualibest",
      "Raid",
      "Saphirus"
    ]
  }
];

const categoriesToggle = document.getElementById("categories-toggle");
const megaMenu = document.getElementById("categories-mega-menu");
const levelOneList = document.getElementById("level-one-list");
const levelTwoList = document.getElementById("level-two-list");
const levelThreeList = document.getElementById("level-three-list");

let activeLevelOneIndex = -1;
let activeLevelTwoIndex = -1;

const defaultMenuIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"/></svg>`;

function buildPublicAssetUrl(relativePath) {
  const cleanedPath = String(relativePath || "").replace(/^\/+/, "");
  const encoded = cleanedPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/${encoded}`;
}

const limpiezaHogarIcons = {
  casa: {
    type: "image",
    src: buildPublicAssetUrl("fotos/icono limpieza del hogar/casa.png"),
    alt: "Casa"
  },
  pisos: {
    type: "image",
    src: buildPublicAssetUrl("fotos/icono limpieza del hogar/pisosysuperficies.png"),
    alt: "Pisos y superficies"
  },
  ropa: {
    type: "image",
    src: buildPublicAssetUrl("fotos/icono limpieza del hogar/cuidado de ropa.png"),
    alt: "Cuidado de ropa"
  },
  cocina: {
    type: "image",
    src: buildPublicAssetUrl("fotos/icono limpieza del hogar/cocina.png"),
    alt: "Cocina"
  },
  bano: {
    type: "image",
    src: buildPublicAssetUrl("fotos/icono limpieza del hogar/baño.png"),
    alt: "Bano"
  },
  ambientes: {
    type: "image",
    src: buildPublicAssetUrl("fotos/icono limpieza del hogar/ambiente.png"),
    alt: "Ambientes"
  },
  casaJardin: {
    type: "image",
    src: buildPublicAssetUrl("fotos/icono limpieza del hogar/casa y jardin.png"),
    alt: "Casa y jardin"
  }
};

const levelOneIcons = {
  "Todos los productos": `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="6" height="6" rx="1.2"/><rect x="14" y="5" width="6" height="6" rx="1.2"/><rect x="4" y="13" width="6" height="6" rx="1.2"/><rect x="14" y="13" width="6" height="6" rx="1.2"/></svg>`,
  "Limpieza del hogar": limpiezaHogarIcons.casa,
  "Productos específicos": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12"/><path d="M8 6v5"/><path d="M16 6v5"/><path d="M7 11h10l-1.1 7H8.1L7 11Z"/><path d="M10 14h4"/></svg>`,
  Saphirus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v7"/><path d="M9 7h6"/><path d="M7.5 13.2c0-2.8 2-4.7 4.5-4.7s4.5 1.9 4.5 4.7c0 3-2.2 5.3-4.5 7.1-2.3-1.8-4.5-4.1-4.5-7.1Z"/></svg>`,
  Marcas: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5 11.3 4h5.2L20 8.5v6.8L12 20l-8-4.7V8.5Z"/><path d="M9 10h6"/><path d="M9 13h4"/></svg>`
};

const levelTwoIconsByParent = {
  "Todos los productos": {
    "Ver todo el catálogo": `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="6" height="6" rx="1.1"/><rect x="14" y="5" width="6" height="6" rx="1.1"/><rect x="4" y="13" width="6" height="6" rx="1.1"/><rect x="14" y="13" width="6" height="6" rx="1.1"/></svg>`,
    "Ofertas destacadas": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16"/><path d="M8 8h1"/><path d="M15 16h1"/><path d="M10.5 6.5 7 10l3.5 3.5"/><path d="M13.5 17.5 17 14l-3.5-3.5"/></svg>`,
    Novedades: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><circle cx="12" cy="12" r="4.3"/></svg>`
  },
  "Limpieza del hogar": {
    "Pisos y Superficies": limpiezaHogarIcons.pisos,
    "Cuidado de Ropa": limpiezaHogarIcons.ropa,
    Cocina: limpiezaHogarIcons.cocina,
    Baño: limpiezaHogarIcons.bano,
    Ambientes: limpiezaHogarIcons.ambientes,
    "Casa y Jardin": limpiezaHogarIcons.casaJardin
  },
  "Productos específicos": {
    Accesorios: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9h10"/><path d="M8 9v9"/><path d="M16 9v9"/><path d="M6 18h12"/><path d="M9 6h6"/></svg>`,
    "Limpieza Profunda": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17h10"/><path d="M8 17V8l4-3 4 3v9"/><path d="M12 10v3"/></svg>`,
    Otros: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="17" cy="12" r="1.6"/></svg>`
  },
  Saphirus: {
    Aparatos: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="4" width="8" height="16" rx="2"/><path d="M10 8h4"/><path d="M10 12h4"/></svg>`,
    Difusores: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v5"/><path d="M9 8.5h6"/><path d="M8 13h8l-1 6H9l-1-6Z"/></svg>`,
    "Difusores Premium": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v5"/><path d="M9 7.5h6"/><path d="M8 12.8h8l-1.2 7H9.2L8 12.8Z"/><path d="M16.5 5.5 18 7"/></svg>`,
    Home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11 12 5l8 6"/><path d="M6 10.5V20h12v-9.5"/><path d="M10 20v-5h4v5"/></svg>`,
    "Holder Sensaciones": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h8"/><path d="M9 8v10h6V8"/><path d="M7 18h10"/></svg>`,
    Sensaciones: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v8"/><path d="M9 8h6"/><path d="M7.8 14.5c0-2.2 1.6-3.8 4.2-3.8s4.2 1.6 4.2 3.8c0 2.4-1.8 4.3-4.2 5.8-2.4-1.5-4.2-3.4-4.2-5.8Z"/></svg>`,
    Textil: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 6.2 6.7 8 4.7 9.2l1.6 2.3L8.5 10V20h7V10l2.2 1.5 1.6-2.3L17.3 8l-1.8-1.8H8.5Z"/></svg>`
  }
};

function getLevelOneIcon(name) {
  return levelOneIcons[name] || defaultMenuIcon;
}

function getLevelTwoIcon(levelOneName, itemName) {
  return levelTwoIconsByParent[levelOneName]?.[itemName] || defaultMenuIcon;
}

function renderMenuIcon(iconDefinition) {
  if (iconDefinition && typeof iconDefinition === "object" && iconDefinition.type === "image" && iconDefinition.src) {
    const alt = String(iconDefinition.alt || "");
    return `<img class="menu-item-icon-image" src="${iconDefinition.src}" alt="${alt}" loading="lazy" decoding="async" />`;
  }

  return iconDefinition || defaultMenuIcon;
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
  return Array.isArray(item.children) && item.children.length > 0;
}

function buildMenuColumn(container, items, itemClass, onEnter, options = {}) {
  const { showIcons = false, getIcon = null } = options;

  container.innerHTML = "";

  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${itemClass} menu-item`;

    const chevron = hasChildren(item) ? '<span class="chevron">›</span>' : "";
    const iconMarkup = showIcons
      ? `<span class="menu-item-icon">${renderMenuIcon(getIcon ? getIcon(item) : defaultMenuIcon)}</span>`
      : "";

    button.innerHTML = `
      <span class="menu-item-main">
        ${iconMarkup}
        <span class="menu-item-label">${item.name}</span>
      </span>
      ${chevron}
    `;

    button.addEventListener("mouseenter", () => onEnter(index));
    button.addEventListener("focus", () => onEnter(index));

    container.appendChild(button);
  });
}

function setActiveItems(container, index) {
  Array.from(container.children).forEach((element, itemIndex) => {
    element.classList.toggle("is-active", itemIndex === index);
  });
}

function hideLevelThree() {
  levelThreeList.innerHTML = "";
  levelThreeList.classList.add("is-hidden");
  activeLevelTwoIndex = -1;
}

function hideLevelTwoAndThree() {
  levelTwoList.innerHTML = "";
  levelTwoList.classList.remove("is-multi-column", "is-wide");
  levelTwoList.classList.add("is-hidden");
  hideLevelThree();
}

function resetMenuState() {
  activeLevelOneIndex = -1;
  activeLevelTwoIndex = -1;
  setActiveItems(levelOneList, -1);
  hideLevelTwoAndThree();
}

function setLevelTwoLayout(levelOneItem) {
  const isFlatList = levelOneItem.children.every((child) => !hasChildren(child));
  const shouldUseBrandsLayout = levelOneItem.name === "Marcas" && isFlatList;

  levelTwoList.classList.toggle("is-multi-column", shouldUseBrandsLayout);
  levelTwoList.classList.toggle("is-wide", shouldUseBrandsLayout);
}

function buildLevelOne() {
  const levelOneItems = categoryTree.map((item) => normalizeItem(item));

  buildMenuColumn(levelOneList, levelOneItems, "category-item", (index) => {
    setActiveLevelOne(index);
  }, {
    showIcons: true,
    getIcon: (item) => getLevelOneIcon(item.name)
  });
}

function setActiveLevelThree(index) {
  const levelOneItem = normalizeItem(categoryTree[activeLevelOneIndex]);
  const levelTwoItems = levelOneItem.children.map((item) => normalizeItem(item));
  const levelTwoItem = levelTwoItems[index];

  setActiveItems(levelTwoList, index);
  activeLevelTwoIndex = index;

  if (!hasChildren(levelTwoItem)) {
    hideLevelThree();
    return;
  }

  levelThreeList.classList.remove("is-hidden");
  buildMenuColumn(levelThreeList, levelTwoItem.children, "subsubcategory-item", () => {});
}

function setActiveLevelOne(index) {
  const levelOneItem = normalizeItem(categoryTree[index]);

  activeLevelOneIndex = index;
  setActiveItems(levelOneList, index);
  setLevelTwoLayout(levelOneItem);

  if (!hasChildren(levelOneItem)) {
    hideLevelTwoAndThree();
    return;
  }

  levelTwoList.classList.remove("is-hidden");
  buildMenuColumn(levelTwoList, levelOneItem.children, "subcategory-item", (levelTwoIndex) => {
    setActiveLevelThree(levelTwoIndex);
  }, {
    showIcons: true,
    getIcon: (item) => getLevelTwoIcon(levelOneItem.name, item.name)
  });
  hideLevelThree();
}

function openMenu() {
  updateMegaMenuHeight();
  megaMenu.classList.add("is-open");
  categoriesToggle.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  megaMenu.classList.remove("is-open");
  categoriesToggle.setAttribute("aria-expanded", "false");
  resetMenuState();
}

function updateMegaMenuHeight() {
  const menuTop = megaMenu.getBoundingClientRect().top;
  const viewportHeight = window.innerHeight;
  const bottomGap = 8;
  const availableHeight = viewportHeight - menuTop - bottomGap;
  const maxDesignHeight = 520;
  const minUsableHeight = 280;
  const finalHeight = Math.max(minUsableHeight, Math.min(maxDesignHeight, availableHeight));

  megaMenu.style.height = `${finalHeight}px`;
}

function initMegaMenu() {
  buildLevelOne();
  resetMenuState();

  categoriesToggle.addEventListener("click", () => {
    const isOpen = megaMenu.classList.contains("is-open");

    if (isOpen) {
      closeMenu();
      return;
    }

    openMenu();
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    const insideMenu = megaMenu.contains(target);
    const insideToggle = categoriesToggle.contains(target);
    const clickedInsideColumn = target instanceof Element && Boolean(target.closest(".mega-column"));

    if (!insideMenu && !insideToggle) {
      closeMenu();
    }

    if (insideMenu && !clickedInsideColumn) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (!megaMenu.classList.contains("is-open")) {
      return;
    }

    updateMegaMenuHeight();
  });
}

initMegaMenu();
