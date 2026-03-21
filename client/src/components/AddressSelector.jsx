import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/AddressSelector.css";

/* ── Zones data: CABA + 38 GBA delivery localities ───── */
// lat/lng used for geolocation matching (center of each municipality)

const ALL_ZONES = [
  { label: "CABA", zone: "caba", city: "CABA", postalCode: "1001", description: "Ciudad Autónoma de Buenos Aires", lat: -34.6137, lng: -58.3816 },
  { label: "Vicente López", zone: "gba", city: "Vicente López, GBA", postalCode: "1602", description: "GBA Norte", lat: -34.5268, lng: -58.4726 },
  { label: "San Isidro", zone: "gba", city: "San Isidro, GBA", postalCode: "1642", description: "GBA Norte", lat: -34.4726, lng: -58.5274 },
  { label: "San Fernando", zone: "gba", city: "San Fernando, GBA", postalCode: "1646", description: "GBA Norte", lat: -34.4424, lng: -58.5565 },
  { label: "San Martín", zone: "gba", city: "San Martín, GBA", postalCode: "1650", description: "GBA Oeste", lat: -34.5760, lng: -58.5380 },
  { label: "Tres de Febrero", zone: "gba", city: "Tres de Febrero, GBA", postalCode: "1657", description: "GBA Oeste", lat: -34.6037, lng: -58.5620 },
  { label: "Hurlingham", zone: "gba", city: "Hurlingham, GBA", postalCode: "1686", description: "GBA Oeste", lat: -34.5888, lng: -58.6377 },
  { label: "Ituzaingó", zone: "gba", city: "Ituzaingó, GBA", postalCode: "1714", description: "GBA Oeste", lat: -34.6590, lng: -58.6656 },
  { label: "Morón", zone: "gba", city: "Morón, GBA", postalCode: "1708", description: "GBA Oeste", lat: -34.6520, lng: -58.6197 },
  { label: "La Matanza Norte", zone: "gba", city: "La Matanza Norte, GBA", postalCode: "1754", description: "GBA Oeste", lat: -34.6830, lng: -58.5630 },
  { label: "Lomas de Zamora", zone: "gba", city: "Lomas de Zamora, GBA", postalCode: "1832", description: "GBA Sur", lat: -34.7615, lng: -58.4003 },
  { label: "Lanús", zone: "gba", city: "Lanús, GBA", postalCode: "1824", description: "GBA Sur", lat: -34.7023, lng: -58.3925 },
  { label: "Avellaneda", zone: "gba", city: "Avellaneda, GBA", postalCode: "1870", description: "GBA Sur", lat: -34.6627, lng: -58.3654 },
  { label: "Quilmes", zone: "gba", city: "Quilmes, GBA", postalCode: "1878", description: "GBA Sur", lat: -34.7232, lng: -58.2536 },
  { label: "Berazategui", zone: "gba", city: "Berazategui, GBA", postalCode: "1884", description: "GBA Sur", lat: -34.7634, lng: -58.2105 },
  { label: "Florencio Varela", zone: "gba", city: "Florencio Varela, GBA", postalCode: "1888", description: "GBA Sur", lat: -34.8117, lng: -58.2753 },
  { label: "Almirante Brown", zone: "gba", city: "Almirante Brown, GBA", postalCode: "1852", description: "GBA Sur", lat: -34.8175, lng: -58.3925 },
  { label: "Esteban Echeverría", zone: "gba", city: "Esteban Echeverría, GBA", postalCode: "1842", description: "GBA Sur", lat: -34.8164, lng: -58.4593 },
  { label: "Ezeiza", zone: "gba", city: "Ezeiza, GBA", postalCode: "1802", description: "GBA Sur", lat: -34.8539, lng: -58.5226 },
  { label: "La Matanza Sur", zone: "gba", city: "La Matanza Sur, GBA", postalCode: "1753", description: "GBA Oeste", lat: -34.7700, lng: -58.6250 },
  { label: "Merlo", zone: "gba", city: "Merlo, GBA", postalCode: "1722", description: "GBA Oeste", lat: -34.6810, lng: -58.7278 },
  { label: "Moreno", zone: "gba", city: "Moreno, GBA", postalCode: "1744", description: "GBA Oeste", lat: -34.6332, lng: -58.7918 },
  { label: "San Miguel", zone: "gba", city: "San Miguel, GBA", postalCode: "1663", description: "GBA Norte", lat: -34.5429, lng: -58.7117 },
  { label: "José C. Paz", zone: "gba", city: "José C. Paz, GBA", postalCode: "1665", description: "GBA Norte", lat: -34.5116, lng: -58.7703 },
  { label: "Malvinas Argentinas", zone: "gba", city: "Malvinas Argentinas, GBA", postalCode: "1613", description: "GBA Norte", lat: -34.4611, lng: -58.6989 },
  { label: "Tigre", zone: "gba", city: "Tigre, GBA", postalCode: "1648", description: "GBA Norte", lat: -34.4260, lng: -58.5797 },
  { label: "Escobar", zone: "gba", city: "Escobar, GBA", postalCode: "1625", description: "GBA Norte", lat: -34.3494, lng: -58.7954 },
  { label: "Pilar", zone: "gba", city: "Pilar, GBA", postalCode: "1629", description: "GBA Norte", lat: -34.4588, lng: -58.9140 },
  { label: "Luján", zone: "gba", city: "Luján, GBA", postalCode: "6700", description: "GBA Oeste", lat: -34.5703, lng: -59.1050 },
  { label: "General Rodríguez", zone: "gba", city: "General Rodríguez, GBA", postalCode: "1748", description: "GBA Oeste", lat: -34.6112, lng: -58.9508 },
  { label: "Marcos Paz", zone: "gba", city: "Marcos Paz, GBA", postalCode: "1727", description: "GBA Oeste", lat: -34.7833, lng: -58.8382 },
  { label: "Cañuelas", zone: "gba", city: "Cañuelas, GBA", postalCode: "1814", description: "GBA Sur", lat: -34.9579, lng: -58.7567 },
  { label: "San Vicente", zone: "gba", city: "San Vicente, GBA", postalCode: "1865", description: "GBA Sur", lat: -34.9941, lng: -58.4293 },
  { label: "Guernica", zone: "gba", city: "Guernica, GBA", postalCode: "1856", description: "GBA Sur", lat: -34.9225, lng: -58.3850 },
  { label: "La Plata", zone: "gba", city: "La Plata, GBA", postalCode: "1900", description: "GBA Sur", lat: -34.9205, lng: -57.9536 },
  { label: "Ensenada", zone: "gba", city: "Ensenada, GBA", postalCode: "1925", description: "GBA Sur", lat: -34.8680, lng: -57.9113 },
  { label: "Berisso", zone: "gba", city: "Berisso, GBA", postalCode: "1923", description: "GBA Sur", lat: -34.8735, lng: -57.8789 },
  { label: "Campana", zone: "gba", city: "Campana, GBA", postalCode: "2804", description: "GBA Norte", lat: -34.1689, lng: -58.9585 },
  { label: "Zárate", zone: "gba", city: "Zárate, GBA", postalCode: "2800", description: "GBA Norte", lat: -34.0981, lng: -59.0284 }
];

// Max distance (in degrees, ~0.5° ≈ 55km) to accept a geolocation match
const MAX_GEO_DISTANCE = 0.5;

const STORAGE_KEY = "delivery:selected-zone";

/* ── Zone detection from postal code ──────────────────── */

function detectZoneFromPostalCode(pc) {
  const trimmed = String(pc || "").trim().toUpperCase();
  if (!trimmed) return null;

  // CABA: CPA prefix C1xxx or numeric 1000-1499
  if (trimmed.startsWith("C1")) return "caba";
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1000 && num <= 1499) return "caba";

  // GBA: CPA prefix B1xxx
  if (trimmed.startsWith("B1")) return "gba";

  // GBA numeric ranges covering all 38 delivery localities
  if (!isNaN(num)) {
    if (num >= 1600 && num <= 1935) return "gba"; // GBA principal + Ensenada/Berisso
    if (num >= 2800 && num <= 2810) return "gba"; // Zárate / Campana
    if (num >= 6700 && num <= 6710) return "gba"; // Luján
  }

  return null;
}

function findNearestZone(lat, lng) {
  let best = null;
  let bestDist = Infinity;
  for (const z of ALL_ZONES) {
    const d = Math.sqrt((z.lat - lat) ** 2 + (z.lng - lng) ** 2);
    if (d < bestDist) { bestDist = d; best = z; }
  }
  return bestDist <= MAX_GEO_DISTANCE ? best : null;
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

export default function AddressSelector({ shippingAddressLabel, user, onOpenMyAddress, onZoneSelect, token, onSyncZone }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postalInput, setPostalInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedZone, setSelectedZone] = useState(() => readStoredZone());
  const [confirmedMessage, setConfirmedMessage] = useState("");
  const [activeTab, setActiveTab] = useState("popular");
  const [geoLocating, setGeoLocating] = useState(false);
  const modalRef = useRef(null);
  const inputRef = useRef(null);
  const confirmTimerRef = useRef(null);
  const selectedItemRef = useRef(null);

  // Derive display — explicit selection wins, then user address, then fallback
  const displayInfo = (() => {
    // Priority 1: user explicitly selected a zone/address
    if (selectedZone?.city) {
      return {
        line1: "Enviar a",
        line2: selectedZone.city,
        hasAddress: true
      };
    }

    // Priority 2: logged-in user with primary address
    if (user && shippingAddressLabel) {
      return {
        line1: "Enviar a",
        line2: shippingAddressLabel,
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isModalOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [isModalOpen]);

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

  // Focus input + scroll to selected zone when modal opens
  useEffect(() => {
    if (isModalOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        // Scroll selected item into view after the list renders
        setTimeout(() => {
          selectedItemRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
        }, 80);
      });
    }
  }, [isModalOpen]);

  // On login, restore zone from backend if available, or push local to backend
  useEffect(() => {
    if (!user || !token) return;
    const backendZone = user.preferredDeliveryZone;
    const localZone = readStoredZone();
    if (backendZone?.city && !localZone) {
      // Backend has zone, local doesn't → restore
      setSelectedZone(backendZone);
      writeStoredZone(backendZone);
    } else if (localZone?.city && !backendZone?.city) {
      // Local has zone, backend doesn't → push
      onSyncZone?.(localZone);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, token]);

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
    setConfirmedMessage(`✅ ¡Tu ubicación está dentro de nuestra zona de envío! (${label})`);
    clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => {
      setConfirmedMessage("");
      setIsModalOpen(false);
    }, 2200);
  }

  function handleSelectZone(zone) {
    const data = {
      city: zone.city,
      zone: zone.zone,
      postalCode: zone.postalCode || ""
    };
    setSelectedZone(data);
    writeStoredZone(data);
    onZoneSelect?.(data);
    if (user && token) onSyncZone?.(data);
    showConfirmation(zone.label || zone.city);
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setConfirmedMessage("Tu navegador no soporta geolocalización.");
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmedMessage(""), 3000);
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        const match = findNearestZone(pos.coords.latitude, pos.coords.longitude);
        if (match) {
          handleSelectZone(match);
        } else {
          setConfirmedMessage("No llegamos hasta tu zona de envío. Consultanos por WhatsApp.");
          clearTimeout(confirmTimerRef.current);
          confirmTimerRef.current = setTimeout(() => setConfirmedMessage(""), 3000);
        }
      },
      () => {
        setGeoLocating(false);
        setConfirmedMessage("No pudimos obtener tu ubicación. Habilitá la geolocalización.");
        clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = setTimeout(() => setConfirmedMessage(""), 3000);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  function handlePostalSubmit(e) {
    e.preventDefault();
    const pc = postalInput.trim();
    if (pc.length < 4) return;

    const zone = detectZoneFromPostalCode(pc);
    if (!zone) {
      setConfirmedMessage("No llegamos hasta tu zona de envío. Verificá el código postal.");
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmedMessage(""), 3000);
      return;
    }

    // Try to match the CP to a known locality for a better label
    const matched = ALL_ZONES.find(z => z.postalCode === pc);
    const cityLabel = matched ? matched.city : (zone === "caba" ? `CABA (CP ${pc})` : `GBA (CP ${pc})`);
    const data = { city: cityLabel, zone, postalCode: pc };
    setSelectedZone(data);
    writeStoredZone(data);
    onZoneSelect?.(data);
    if (user && token) onSyncZone?.(data);
    showConfirmation(matched ? matched.label : cityLabel);
  }

  function handleGoToFullAddress() {
    setIsModalOpen(false);
    onOpenMyAddress?.();
  }

  // Filter zones by search (memoized for 39 items)
  const filteredZones = useMemo(() => {
    const q = searchInput.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!q) return ALL_ZONES;
    return ALL_ZONES.filter((z) => {
      const target = `${z.label} ${z.description} ${z.postalCode}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return target.includes(q);
    });
  }, [searchInput]);

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
        aria-label={displayInfo.hasAddress ? `Zona de envío: ${displayInfo.line2}` : "Elegí tu zona de envío"}
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
              <div className={`as-toast${confirmedMessage.startsWith("No") || confirmedMessage.startsWith("Tu nav") ? " as-toast-error" : ""}`} role="status">
                {confirmedMessage.startsWith("No") || confirmedMessage.startsWith("Tu nav") ? (
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
                  Verificar
                </button>
              </div>
              <p className="as-postal-hint">
                Ejemplo: 1425, 1636, C1425
              </p>
            </form>

            {/* Geolocation button */}
            <button
              type="button"
              className="as-geo-btn"
              onClick={handleGeolocate}
              disabled={geoLocating}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                <circle cx="12" cy="12" r="8" fill="none" />
              </svg>
              {geoLocating ? "Detectando..." : "Usar mi ubicación"}
            </button>

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
                Zonas de envío
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
                      placeholder="Buscar localidad..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </div>
                  <ul className="as-zone-list" role="listbox">
                    {filteredZones.length > 0 ? (
                      filteredZones.map((zone) => {
                        const isSelected = selectedZone?.city === zone.city;
                        return (
                        <li key={zone.label} ref={isSelected ? selectedItemRef : undefined}>
                          <button
                            type="button"
                            className={`as-zone-item${isSelected ? " as-zone-selected" : ""}`}
                            role="option"
                            aria-selected={isSelected}
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
                            {isSelected && (
                              <span className="as-zone-check" aria-hidden="true">✓</span>
                            )}
                          </button>
                        </li>
                        );
                      })
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
              <button
                type="button"
                className="as-map-link-btn"
                onClick={() => {
                  setIsModalOpen(false);
                  const el = document.getElementById("cobertura-envios");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
                Ver mapa de cobertura
              </button>
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
