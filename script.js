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

const levelOneIcons = {
  "Todos los productos": `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="6" height="6" rx="1.2"/><rect x="14" y="5" width="6" height="6" rx="1.2"/><rect x="4" y="13" width="6" height="6" rx="1.2"/><rect x="14" y="13" width="6" height="6" rx="1.2"/></svg>`,
  "Limpieza del hogar": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4h4"/><path d="M10.5 4v4l-2.8 4.1V18h8.6v-5.9L13.5 8V4"/><path d="M8.4 12h7.2"/></svg>`,
  "Productos específicos": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12"/><path d="M8 6v5"/><path d="M16 6v5"/><path d="M7 11h10l-1.1 7H8.1L7 11Z"/><path d="M10 14h4"/></svg>`,
  Saphirus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v7"/><path d="M9 7h6"/><path d="M7.5 13.2c0-2.8 2-4.7 4.5-4.7s4.5 1.9 4.5 4.7c0 3-2.2 5.3-4.5 7.1-2.3-1.8-4.5-4.1-4.5-7.1Z"/></svg>`,
  Marcas: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5 11.3 4h5.2L20 8.5v6.8L12 20l-8-4.7V8.5Z"/><path d="M9 10h6"/><path d="M9 13h4"/></svg>`
};

function getLevelOneIcon(name) {
  return levelOneIcons[name] || `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"/></svg>`;
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

function buildMenuColumn(container, items, itemClass, onEnter, showLevelOneIcons = false) {
  container.innerHTML = "";

  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${itemClass} menu-item`;

    const chevron = hasChildren(item) ? '<span class="chevron">›</span>' : "";
    const iconMarkup = showLevelOneIcons
      ? `<span class="menu-item-icon">${getLevelOneIcon(item.name)}</span>`
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
  }, true);
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
