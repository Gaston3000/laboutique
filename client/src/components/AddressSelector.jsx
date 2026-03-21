import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/AddressSelector.css";

/* ── Argentine zones data ─────────────────────────────── */

const CABA_BARRIOS = [
  "Palermo", "Recoleta", "Belgrano", "Caballito", "Almagro",
  "Villa Crespo", "Núñez", "Colegiales", "Villa Urquiza", "Flores",
  "Balvanera", "San Telmo", "La Boca", "Barracas", "Boedo",
  "Monserrat", "San Nicolás", "Retiro", "Puerto Madero", "Constitución",
  "Villa del Parque", "Devoto", "Saavedra", "Coghlan", "Villa Luro",
  "Liniers", "Mataderos", "Parque Patricios", "Pompeya"
];

const GBA_LOCALIDADES = [
  "Vicente López", "San Isidro", "San Fernando", "Tigre",
  "Olivos", "Martínez", "Acassuso", "Boulogne", "Beccar",
  "Florida", "Munro", "Carapachay", "Villa Adelina",
  "San Martín", "Tres de Febrero", "Caseros", "Hurlingham",
  "Ituzaingó", "Morón", "Haedo", "Ramos Mejía",
  "Lomas de Zamora", "Banfield", "Lanús", "Avellaneda",
  "Quilmes", "Berazategui", "Florencio Varela",
  "La Plata", "La Matanza", "Ezeiza", "Pilar"
];

const POPULAR_ZONES = [
  { label: "CABA", zone: "caba", city: "Buenos Aires", postalCode: "1001", description: "Ciudad Autónoma de Buenos Aires" },
  { label: "Palermo", zone: "caba", city: "Palermo, CABA", postalCode: "1425", description: "CABA" },
  { label: "Belgrano", zone: "caba", city: "Belgrano, CABA", postalCode: "1428", description: "CABA" },
  { label: "Recoleta", zone: "caba", city: "Recoleta, CABA", postalCode: "1425", description: "CABA" },
  { label: "Caballito", zone: "caba", city: "Caballito, CABA", postalCode: "1406", description: "CABA" },
  { label: "Vicente López", zone: "gba", city: "Vicente López, GBA", postalCode: "1638", description: "GBA Norte" },
  { label: "San Isidro", zone: "gba", city: "San Isidro, GBA", postalCode: "1642", description: "GBA Norte" },
  { label: "Olivos", zone: "gba", city: "Olivos, GBA", postalCode: "1636", description: "GBA Norte" },
  { label: "Lomas de Zamora", zone: "gba", city: "Lomas de Zamora, GBA", postalCode: "1832", description: "GBA Sur" },
  { label: "Quilmes", zone: "gba", city: "Quilmes, GBA", postalCode: "1878", description: "GBA Sur" }
];

const STORAGE_KEY = "delivery:selected-zone";

/* ── Zone detection from postal code ──────────────────── */

function detectZoneFromPostalCode(pc) {
  const trimmed = String(pc || "").trim().toUpperCase();
  if (!trimmed) return null;

  if (trimmed.startsWith("C1")) return "caba";
  const num = parseInt(trimmed, 10);
  if (num >= 1000 && num <= 1499) return "caba";

  // Common GBA postal codes
  if (num >= 1600 && num <= 1900) return "gba";
  if (trimmed.startsWith("B1")) return "gba";

  return null;
}

function buildLabel(city, postalCode) {
  const c = String(city || "").trim();
  const pc = String(postalCode || "").trim();
  if (c && pc) return `${c} ${pc}`;
  if (c) return c;
  if (pc) return pc;
  return "";
}

function readStoredZone() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStoredZone(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // silent
  }
}

/* ── AddressSelector component ────────────────────────── */

export default function AddressSelector({ shippingAddressLabel, user, onOpenMyAddress }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postalInput, setPostalInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedZone, setSelectedZone] = useState(() => readStoredZone());
  const [confirmedMessage, setConfirmedMessage] = useState("");
  const [activeTab, setActiveTab] = useState("popular");
  const modalRef = useRef(null);
  const inputRef = useRef(null);
  const confirmTimerRef = useRef(null);

  // Derive display from user address or stored zone
  const displayInfo = (() => {
    // Priority 1: logged-in user with address
    if (user && shippingAddressLabel) {
      return {
        line1: "Enviar a",
        line2: shippingAddressLabel,
        hasAddress: true
      };
    }

    // Priority 2: stored zone selection
    if (selectedZone?.city) {
      return {
        line1: "Enviar a",
        line2: selectedZone.city,
        hasAddress: true
      };
    }

    // Fallback: no address
    return {
      line1: "Elegí tu",
      line2: "zona de envío",
      hasAddress: false
    };
  })();

  // Close modal on outside click
  useEffect(() => {
    if (!isModalOpen) return;

    function handlePointerDown(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setIsModalOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") setIsModalOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isModalOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isModalOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isModalOpen]);

  // Cleanup confirmation timer
  useEffect(() => {
    return () => clearTimeout(confirmTimerRef.current);
  }, []);

  function handleOpen() {
    setIsModalOpen(true);
    setPostalInput("");
    setSearchInput("");
    setConfirmedMessage("");
    setActiveTab("popular");
  }

  function showConfirmation(label) {
    setConfirmedMessage(`Enviando a ${label}`);
    clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => {
      setConfirmedMessage("");
      setIsModalOpen(false);
    }, 1800);
  }

  function handleSelectZone(zone) {
    const data = {
      city: zone.city,
      zone: zone.zone,
      postalCode: zone.postalCode || ""
    };
    setSelectedZone(data);
    writeStoredZone(data);
    showConfirmation(zone.label || zone.city);
  }

  function handlePostalSubmit(e) {
    e.preventDefault();
    const pc = postalInput.trim();
    if (pc.length < 4) return;

    const zone = detectZoneFromPostalCode(pc);
    if (!zone) {
      setConfirmedMessage("No pudimos detectar la zona. Verificá el código postal.");
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmedMessage(""), 3000);
      return;
    }

    const cityLabel = zone === "caba" ? `CABA ${pc}` : `GBA ${pc}`;
    const data = { city: cityLabel, zone, postalCode: pc };
    setSelectedZone(data);
    writeStoredZone(data);
    showConfirmation(cityLabel);
  }

  function handleGoToFullAddress() {
    setIsModalOpen(false);
    onOpenMyAddress?.();
  }

  // Filter popular zones by search
  const filteredZones = searchInput.trim()
    ? POPULAR_ZONES.filter((z) => {
      const q = searchInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const target = `${z.label} ${z.description} ${z.postalCode}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return target.includes(q);
    })
    : POPULAR_ZONES;

  // Address book entries (for logged-in users)
  const addressBookEntries = (() => {
    if (!Array.isArray(user?.addressBook)) return [];
    return user.addressBook
      .map((entry) => ({
        id: entry.id,
        label: [String(entry.street || ""), String(entry.height || "")].filter(Boolean).join(" ") || "Dirección guardada",
        city: String(entry.city || "Buenos Aires"),
        postalCode: String(entry.postalCode || ""),
        zone: detectZoneFromPostalCode(entry.postalCode) || "gba"
      }))
      .filter((e) => e.label !== "Dirección guardada" || e.postalCode);
  })();

  const hasAddressBook = addressBookEntries.length > 0;

  return (
    <>
      {/* ── Trigger button ─────────────────────────────── */}
      <button
        type="button"
        className={`as-trigger${displayInfo.hasAddress ? " as-has-address" : ""}`}
        onClick={handleOpen}
        aria-label={displayInfo.hasAddress ? `Enviando a ${displayInfo.line2}` : "Elegí tu zona de envío"}
        aria-haspopup="dialog"
      >
        <span className="as-trigger-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.6" />
          </svg>
        </span>
        <span className="as-trigger-text">
          <span className="as-trigger-line1">{displayInfo.line1}</span>
          <span className="as-trigger-line2">{displayInfo.line2}</span>
        </span>
      </button>

      {/* ── Modal ──────────────────────────────────────── */}
      {isModalOpen && createPortal(
        <div className="as-modal-backdrop" role="presentation">
          <div
            className="as-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Seleccionar zona de envío"
          >
            {/* Header */}
            <div className="as-modal-header">
              <h2 className="as-modal-title">
                <span className="as-modal-title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
                    <circle cx="12" cy="10" r="2.6" />
                  </svg>
                </span>
                Elegí tu zona de envío
              </h2>
              <button
                type="button"
                className="as-modal-close"
                aria-label="Cerrar"
                onClick={() => setIsModalOpen(false)}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Confirmation toast */}
            {confirmedMessage && (
              <div className={`as-toast${confirmedMessage.startsWith("No") ? " as-toast-error" : ""}`} role="status">
                {confirmedMessage.startsWith("No") ? (
                  <span className="as-toast-icon" aria-hidden="true">⚠</span>
                ) : (
                  <span className="as-toast-icon" aria-hidden="true">✓</span>
                )}
                <span>{confirmedMessage}</span>
              </div>
            )}

            {/* CP quick input */}
            <form className="as-postal-form" onSubmit={handlePostalSubmit}>
              <div className="as-postal-input-wrap">
                <input
                  ref={inputRef}
                  type="text"
                  className="as-postal-input"
                  placeholder="Ingresá tu código postal"
                  value={postalInput}
                  onChange={(e) => setPostalInput(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8))}
                  maxLength={8}
                  autoComplete="postal-code"
                />
                <button
                  type="submit"
                  className="as-postal-btn"
                  disabled={postalInput.trim().length < 4}
                >
                  Aplicar
                </button>
              </div>
              <p className="as-postal-hint">
                Ejemplo: 1425, 1636, C1425
              </p>
            </form>

            {/* Shipping info badge */}
            <div className="as-shipping-info">
              <div className="as-shipping-info-item as-shipping-caba">
                <span className="as-shipping-badge">CABA</span>
                <span>Envío $5.000 · Gratis desde $50.000</span>
              </div>
              <div className="as-shipping-info-item as-shipping-gba">
                <span className="as-shipping-badge as-badge-gba">GBA</span>
                <span>Envío $7.000 · Gratis desde $50.000</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="as-tabs" role="tablist">
              <button
                type="button"
                className={`as-tab${activeTab === "popular" ? " as-tab-active" : ""}`}
                role="tab"
                aria-selected={activeTab === "popular"}
                onClick={() => setActiveTab("popular")}
              >
                Zonas populares
              </button>
              {hasAddressBook && (
                <button
                  type="button"
                  className={`as-tab${activeTab === "saved" ? " as-tab-active" : ""}`}
                  role="tab"
                  aria-selected={activeTab === "saved"}
                  onClick={() => setActiveTab("saved")}
                >
                  Mis direcciones
                </button>
              )}
            </div>

            {/* Tab content */}
            <div className="as-tab-content">
              {activeTab === "popular" && (
                <>
                  <div className="as-search-wrap">
                    <svg className="as-search-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M10.5 3a7.5 7.5 0 0 1 5.95 12.08l4.24 4.24a1 1 0 0 1-1.42 1.42l-4.24-4.24A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z" />
                    </svg>
                    <input
                      type="text"
                      className="as-search-input"
                      placeholder="Buscar barrio o localidad..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </div>
                  <ul className="as-zone-list" role="listbox">
                    {filteredZones.length > 0 ? (
                      filteredZones.map((zone) => (
                        <li key={zone.label}>
                          <button
                            type="button"
                            className={`as-zone-item${selectedZone?.city === zone.city ? " as-zone-selected" : ""}`}
                            role="option"
                            aria-selected={selectedZone?.city === zone.city}
                            onClick={() => handleSelectZone(zone)}
                          >
                            <span className="as-zone-pin" aria-hidden="true">
                              <svg viewBox="0 0 24 24">
                                <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
                                <circle cx="12" cy="10" r="2.6" />
                              </svg>
                            </span>
                            <span className="as-zone-details">
                              <span className="as-zone-name">{zone.label}</span>
                              <span className="as-zone-desc">{zone.description}</span>
                            </span>
                            <span className={`as-zone-tag ${zone.zone === "caba" ? "as-tag-caba" : "as-tag-gba"}`}>
                              {zone.zone === "caba" ? "CABA" : "GBA"}
                            </span>
                            {selectedZone?.city === zone.city && (
                              <span className="as-zone-check" aria-hidden="true">✓</span>
                            )}
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="as-zone-empty">
                        No encontramos esa zona. Probá con el código postal.
                      </li>
                    )}
                  </ul>
                </>
              )}

              {activeTab === "saved" && hasAddressBook && (
                <ul className="as-zone-list as-saved-list" role="listbox">
                  {addressBookEntries.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className="as-zone-item as-saved-item"
                        role="option"
                        onClick={() => handleSelectZone({
                          label: entry.label,
                          city: `${entry.label}, ${entry.city}`,
                          zone: entry.zone,
                          postalCode: entry.postalCode
                        })}
                      >
                        <span className="as-zone-pin" aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                          </svg>
                        </span>
                        <span className="as-zone-details">
                          <span className="as-zone-name">{entry.label}</span>
                          <span className="as-zone-desc">
                            {entry.city}{entry.postalCode ? ` · CP ${entry.postalCode}` : ""}
                          </span>
                        </span>
                        <span className={`as-zone-tag ${entry.zone === "caba" ? "as-tag-caba" : "as-tag-gba"}`}>
                          {entry.zone === "caba" ? "CABA" : "GBA"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="as-modal-footer">
              {user ? (
                <button
                  type="button"
                  className="as-full-address-btn"
                  onClick={handleGoToFullAddress}
                >
                  Administrar mis direcciones
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  className="as-full-address-btn"
                  onClick={handleGoToFullAddress}
                >
                  Iniciá sesión para guardar direcciones
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
