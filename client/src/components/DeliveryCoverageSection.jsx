import { useState } from "react";

const DELIVERY_LOCALITIES = [
  "Vicente Lopez",
  "San Isidro",
  "San Fernando",
  "San Martin",
  "Tres de Febrero",
  "Hurlingham",
  "Ituzaingo",
  "Morón",
  "La Matanza Norte",
  "Lomas de Zamora",
  "Lanus",
  "Avellaneda",
  "Quilmes",
  "Berazategui",
  "Florencio Varela",
  "Almirante Brown",
  "Esteban Echeverría",
  "Ezeiza",
  "La Matanza Sur",
  "Merlo",
  "Moreno",
  "San Miguel",
  "José C. Paz",
  "Malvinas Argentinas",
  "Tigre",
  "Escobar",
  "Pilar",
  "Luján",
  "General Rodríguez",
  "Marcos Paz",
  "Cañuelas",
  "San Vicente",
  "Guernica",
  "La Plata",
  "Ensenada",
  "Berisso",
  "Campana",
  "Zárate"
];

function DeliveryZoneColumn({ title, from, to, hoveredZone, onEnter, onLeave }) {
  const items = DELIVERY_LOCALITIES.slice(from - 1, to);

  return (
    <article className="delivery-zone-column" aria-label={`Localidades ${title}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((name, index) => {
          const zoneNumber = from + index;

          return (
            <li key={zoneNumber}>
              <button
                type="button"
                className={`delivery-zone-item${hoveredZone === zoneNumber ? " is-active" : ""}`}
                onMouseEnter={() => onEnter(zoneNumber)}
                onMouseLeave={onLeave}
                onFocus={() => onEnter(zoneNumber)}
                onBlur={onLeave}
                aria-label={`Zona ${zoneNumber}, ${name}`}
              >
                <span className="delivery-zone-item-number">{zoneNumber}-</span>{" "}
                <span className="delivery-zone-item-name">{name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default function DeliveryCoverageSection() {
  const [hoveredZone, setHoveredZone] = useState(0);
  const [mapTooltipZone, setMapTooltipZone] = useState(0);
  const [mobileTab, setMobileTab] = useState("map");

  function handleTableEnter(zoneId) {
    setHoveredZone(zoneId);
    setMapTooltipZone(zoneId);
  }

  function handleTableLeave() {
    setHoveredZone(0);
    setMapTooltipZone(0);
  }

  function handleMapEnter(zoneId) {
    setHoveredZone(zoneId);
    setMapTooltipZone(zoneId);
  }

  function handleMapLeave() {
    setHoveredZone(0);
    setMapTooltipZone(0);
  }

  const mapContent = (
    <div className="delivery-map-card">
      <div className={`delivery-map${hoveredZone ? " has-highlight" : ""}`} role="img" aria-label="Mapa de zonas de entrega numeradas">
        <img src="/fotos/mapaBSAS-SinFondo.png" alt="Mapa de zonas de entrega" />
        {Array.from({ length: 38 }, (_, index) => index + 1).map((zoneId) => {
          const isActive = hoveredZone === zoneId;
          const localityName = DELIVERY_LOCALITIES[zoneId - 1] || "";

          return (
            <button
              type="button"
              key={zoneId}
              className={`delivery-map-label zone-${zoneId}${isActive ? " is-active" : ""}`}
              onMouseEnter={() => handleMapEnter(zoneId)}
              onMouseLeave={handleMapLeave}
              onFocus={() => handleMapEnter(zoneId)}
              onBlur={handleMapLeave}
              aria-label={`Zona ${zoneId}, ${localityName}`}
            >
              {zoneId}
            </button>
          );
        })}
        <div className={`delivery-map-tooltip${mapTooltipZone ? " is-visible" : ""}`} aria-hidden={mapTooltipZone ? "false" : "true"}>
          <span className="delivery-map-tooltip-zone">Zona {mapTooltipZone || "-"}</span>
          <span className="delivery-map-tooltip-name">{mapTooltipZone ? DELIVERY_LOCALITIES[mapTooltipZone - 1] : ""}</span>
        </div>
        <span className="delivery-map-caba" aria-hidden="true">C.A.B.A.</span>
      </div>
    </div>
  );

  const mobileMapContent = (
    <div className="delivery-map-card delivery-map-card--old">
      <div className={`delivery-map delivery-map--old${hoveredZone ? " has-highlight" : ""}`} role="img" aria-label="Mapa de zonas de entrega numeradas">
        <img src="/fotos/pngmapasinnumeros.webp" alt="Mapa de zonas de entrega" />
        {Array.from({ length: 38 }, (_, index) => index + 1).map((zoneId) => {
          const localityName = DELIVERY_LOCALITIES[zoneId - 1] || "";
          return (
            <span
              key={zoneId}
              className={`delivery-map-label delivery-map-label--old zone-old-${zoneId}`}
              aria-label={`Zona ${zoneId}, ${localityName}`}
            >
              {zoneId}
            </span>
          );
        })}
        <span className="delivery-map-caba" aria-hidden="true">C.A.B.A.</span>
      </div>
    </div>
  );

  const desktopTableContent = (
    <div className="delivery-zone-columns" aria-label="Listado de localidades por zona">
      <DeliveryZoneColumn
        title="1-12"
        from={1}
        to={12}
        hoveredZone={hoveredZone}
        onEnter={handleTableEnter}
        onLeave={handleTableLeave}
      />
      <DeliveryZoneColumn
        title="13-25"
        from={13}
        to={25}
        hoveredZone={hoveredZone}
        onEnter={handleTableEnter}
        onLeave={handleTableLeave}
      />
      <DeliveryZoneColumn
        title="26-38"
        from={26}
        to={38}
        hoveredZone={hoveredZone}
        onEnter={handleTableEnter}
        onLeave={handleTableLeave}
      />
    </div>
  );

  const mobileTableContent = (
    <div className="delivery-zone-columns" aria-label="Listado de localidades por zona">
      <DeliveryZoneColumn
        title="1-19"
        from={1}
        to={19}
        hoveredZone={hoveredZone}
        onEnter={handleTableEnter}
        onLeave={handleTableLeave}
      />
      <DeliveryZoneColumn
        title="20-38"
        from={20}
        to={38}
        hoveredZone={hoveredZone}
        onEnter={handleTableEnter}
        onLeave={handleTableLeave}
      />
    </div>
  );

  return (
    <section className="delivery-coverage" aria-label="Localidades con entrega disponible">
      <header className="delivery-coverage-header">
        <h2>Localidades con entrega disponible</h2>
        <p>Realizamos envíos en toda CABA y en estas 38 localidades de la Provincia de Buenos Aires.</p>
      </header>

      <nav className="delivery-tabs" aria-label="Alternar entre mapa y localidades">
        <button
          type="button"
          className={`delivery-tab${mobileTab === "map" ? " is-active" : ""}`}
          onClick={() => setMobileTab("map")}
          aria-pressed={mobileTab === "map"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          Mapa
        </button>
        <button
          type="button"
          className={`delivery-tab${mobileTab === "list" ? " is-active" : ""}`}
          onClick={() => setMobileTab("list")}
          aria-pressed={mobileTab === "list"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Localidades
        </button>
      </nav>

      {/* Desktop: side by side (interactive map) */}
      <div className="delivery-coverage-layout delivery-desktop-layout">
        {mapContent}
        {desktopTableContent}
      </div>

      {/* Mobile: tab content */}
      <div className="delivery-mobile-panel">
        {mobileTab === "map" ? mobileMapContent : mobileTableContent}
      </div>
    </section>
  );
}