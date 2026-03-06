import { useEffect, useMemo, useState } from "react";
import TicketsPanel from "./TicketsPanel";

const ACCOUNT_TABS = [
  { key: "cuenta", label: "Mi cuenta" },
  { key: "pedidos", label: "Mis pedidos" },
  { key: "direccion", label: "Mi dirección" },
  { key: "billetera", label: "Billetera" },
  { key: "favoritos", label: "Productos favoritos" },
  { key: "suscripciones", label: "Mis suscripciones" },
  { key: "tickets", label: "Tickets" }
];

const SHIPPING_ZONES = [
  "CABA",
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
].sort((leftZone, rightZone) => {
  if (leftZone === "CABA") {
    return -1;
  }

  if (rightZone === "CABA") {
    return 1;
  }

  return leftZone.localeCompare(rightZone, "es", { sensitivity: "base" });
});

const MAX_ADDRESSES = 5;

function createAddressId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `addr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyAddressForm() {
  return {
    street: "",
    height: "",
    floor: "",
    apartment: "",
    city: "Buenos Aires",
    region: "",
    country: "Argentina",
    postalCode: "",
    phone: ""
  };
}

function parseLegacyAddress(addressValue) {
  const normalizedAddress = String(addressValue || "").trim();
  if (!normalizedAddress) {
    return null;
  }

  const [line = "", city = "Buenos Aires", region = "", postalRaw = ""] = normalizedAddress
    .split(",")
    .map((item) => String(item || "").trim());

  const lineMatch = line.match(/^(.*?)(\d+[\w\-\/]*)\s*$/u);
  const street = (lineMatch?.[1] || line).trim();
  const height = String(lineMatch?.[2] || "").trim();
  const postalCode = postalRaw.replace(/^CP\s*/i, "").trim();

  return {
    id: createAddressId(),
    street,
    height,
    floor: "",
    apartment: "",
    city: city || "Buenos Aires",
    region,
    country: "Argentina",
    postalCode,
    phone: ""
  };
}

function normalizeAddressEntry(entry, fallbackId) {
  return {
    id: String(entry?.id || fallbackId || createAddressId()),
    street: String(entry?.street || "").trim(),
    height: String(entry?.height || "").trim(),
    floor: String(entry?.floor || "").trim(),
    apartment: String(entry?.apartment || "").trim(),
    city: String(entry?.city || "Buenos Aires").trim() || "Buenos Aires",
    region: String(entry?.region || "").trim(),
    country: "Argentina",
    postalCode: String(entry?.postalCode || "").trim(),
    phone: String(entry?.phone || "").trim()
  };
}

function getInitialAddresses(user) {
  const fromBook = Array.isArray(user?.addressBook)
    ? user.addressBook
      .map((entry, index) => normalizeAddressEntry(entry, `addr-${index + 1}`))
      .filter((entry) => entry.street || entry.height)
      .slice(0, MAX_ADDRESSES)
    : [];

  if (fromBook.length > 0) {
    return fromBook;
  }

  const fallbackAddress = parseLegacyAddress(user?.address);
  return fallbackAddress ? [fallbackAddress] : [];
}

function formatAddressHeadline(address) {
  const street = String(address?.street || "").trim();
  const height = String(address?.height || "").trim();

  return [street, height].filter(Boolean).join(" ").trim();
}

function formatAddressDetails(address) {
  return [
    address?.floor ? `Piso ${address.floor}` : "",
    address?.apartment ? `Depto ${address.apartment}` : "",
    address?.city ? `Ciudad: ${address.city}` : "",
    address?.region ? `Zona: ${address.region}` : "",
    address?.postalCode ? `CP: ${address.postalCode}` : ""
  ]
    .filter(Boolean)
    .join(" · ");
}

function splitName(fullName) {
  const value = String(fullName || "").trim();

  if (!value) {
    return { firstName: "", lastName: "" };
  }

  const parts = value.split(/\s+/);
  const firstName = parts.shift() || "";
  const lastName = parts.join(" ");

  return { firstName, lastName };
}

function createProfileForm(user) {
  const firstName = String(user?.firstName || "").trim();
  const lastName = String(user?.lastName || "").trim();
  const fallbackNameParts = splitName(user?.name);

  return {
    displayName: user?.name || "",
    profileTitle: user?.profileTitle || "",
    firstName: firstName || fallbackNameParts.firstName,
    lastName: lastName || fallbackNameParts.lastName,
    phone: user?.phone || "",
    avatarUrl: user?.avatarUrl || "",
    profileVisibility: "visible"
  };
}

function getProfileInitials({ firstName, lastName, displayName, email }) {
  const normalizedFirst = String(firstName || "").trim();
  const normalizedLast = String(lastName || "").trim();

  const fromNames = `${normalizedFirst.charAt(0)}${normalizedLast.charAt(0)}`.trim();
  if (fromNames) {
    return fromNames.toUpperCase();
  }

  const fallbackSource = String(displayName || email || "").trim();
  if (!fallbackSource) {
    return "MC";
  }

  const words = fallbackSource.split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) || "";
  const second = words[1]?.charAt(0) || words[0]?.charAt(1) || "";

  return `${first}${second}`.toUpperCase() || "MC";
}

export default function AccountPanel({
  user,
  initialTab = "cuenta",
  isAdmin,
  totalItems,
  cartSubtotal,
  orders,
  tickets = [],
  ticketMetrics = { open: 0, inProgress: 0, testing: 0, closed: 0 },
  isTicketsLoading = false,
  lowStockAlerts,
  onGoHome,
  onGoCart,
  onGoAdmin,
  onCreateTicket,
  onAddTicketComment,
  onReloadTickets,
  onSaveProfile,
  onSaveAddress
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isBlockedOpen, setIsBlockedOpen] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const nameParts = useMemo(() => splitName(user?.name), [user?.name]);

  const [form, setForm] = useState(() => createProfileForm(user));

  const [addressForm, setAddressForm] = useState(() => createEmptyAddressForm());
  const [addresses, setAddresses] = useState(() => getInitialAddresses(user));

  useEffect(() => {
    const tabExists = ACCOUNT_TABS.some((tab) => tab.key === initialTab);
    setActiveTab(tabExists ? initialTab : "cuenta");
  }, [initialTab]);

  useEffect(() => {
    setForm(createProfileForm(user));

    setAddressForm(createEmptyAddressForm());
    setAddresses(getInitialAddresses(user));
    setProfileError("");
  }, [nameParts.firstName, nameParts.lastName, user?.address, user?.avatarUrl, user?.name, user?.phone, user?.profileTitle, user?.firstName, user?.lastName, user?.addressBook]);

  useEffect(() => {
    if (!saveMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveMessage("");
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveMessage]);

  function handleFieldChange(field, value) {
    setProfileError("");
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleAddressFieldChange(field, value) {
    setAddressError("");
    setAddressForm((current) => ({ ...current, [field]: value }));
  }

  function getPrimaryAddressId(sourceAddresses) {
    const availableAddresses = Array.isArray(sourceAddresses) ? sourceAddresses : [];

    if (!availableAddresses.length) {
      return "";
    }

    const preferredId = String(user?.primaryAddressId || "").trim();
    const hasPreferred = preferredId && availableAddresses.some((address) => address.id === preferredId);

    if (hasPreferred) {
      return preferredId;
    }

    return availableAddresses[0].id;
  }

  function handleDiscard() {
    setForm(createProfileForm(user));
    setProfileError("");
    setSaveMessage("");
  }

  async function handleSave() {
    setIsSaving(true);
    setProfileError("");

    try {
      const payload = {
        displayName: String(form.displayName || "").trim(),
        firstName: String(form.firstName || "").trim(),
        lastName: String(form.lastName || "").trim(),
        profileTitle: String(form.profileTitle || "").trim(),
        phone: String(form.phone || "").trim(),
        avatarUrl: String(form.avatarUrl || "").trim()
      };

      if (typeof onSaveProfile === "function") {
        const savedUser = await onSaveProfile(payload);
        if (savedUser && typeof savedUser === "object") {
          setForm(createProfileForm({ ...user, ...savedUser }));
        }
      } else {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 550);
        });
      }

      setSaveMessage("Información actualizada.");
    } catch (error) {
      setProfileError(error?.message || "No se pudo actualizar la información.");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [form.avatarUrl, user?.avatarUrl]);

  async function handleSaveAddress() {
    const normalizedStreet = String(addressForm.street || "").trim();
    const normalizedHeight = String(addressForm.height || "").trim();
    const normalizedFloor = String(addressForm.floor || "").trim();
    const normalizedApartment = String(addressForm.apartment || "").trim();
    const normalizedPostalCode = String(addressForm.postalCode || "").trim();
    const normalizedRegion = String(addressForm.region || "").trim();
    const normalizedCity = String(addressForm.city || "Buenos Aires").trim() || "Buenos Aires";
    const normalizedPhone = String(addressForm.phone || "").trim();

    if (!normalizedStreet) {
      setAddressError("La dirección es obligatoria.");
      return;
    }

    if (!normalizedHeight) {
      setAddressError("La altura es obligatoria.");
      return;
    }

    if (!normalizedRegion || !SHIPPING_ZONES.includes(normalizedRegion)) {
      setAddressError("Seleccioná una zona de envío válida.");
      return;
    }

    if (!normalizedPostalCode) {
      setAddressError("El código postal es obligatorio.");
      return;
    }

    if (addresses.length >= MAX_ADDRESSES) {
      setAddressError(`Podés guardar hasta ${MAX_ADDRESSES} direcciones.`);
      return;
    }

    setIsSaving(true);

    try {
      const newAddress = normalizeAddressEntry({
        id: createAddressId(),
        street: normalizedStreet,
        height: normalizedHeight,
        floor: normalizedFloor,
        apartment: normalizedApartment,
        city: normalizedCity,
        region: normalizedRegion,
        country: "Argentina",
        postalCode: normalizedPostalCode,
        phone: normalizedPhone
      });

      const nextAddresses = [...addresses, newAddress];
      const nextPrimaryAddressId = getPrimaryAddressId(nextAddresses);
      const payload = {
        addresses: nextAddresses,
        primaryAddressId: nextPrimaryAddressId
      };

      let savedResult = null;

      if (typeof onSaveAddress === "function") {
        savedResult = await onSaveAddress(payload);
      } else {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 550);
        });
      }

      const persistedAddresses = Array.isArray(savedResult?.addressBook)
        ? savedResult.addressBook
          .map((entry, index) => normalizeAddressEntry(entry, `addr-${index + 1}`))
          .slice(0, MAX_ADDRESSES)
        : nextAddresses;

      setAddresses(persistedAddresses);

      setAddressForm(createEmptyAddressForm());
      setSaveMessage("Dirección guardada correctamente.");
      setAddressError("");
    } catch (error) {
      setAddressError(error?.message || "No se pudo guardar la dirección.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDiscardAddress() {
    setAddressForm(createEmptyAddressForm());
    setAddressError("");
    setSaveMessage("");
  }

  function handleAddAnotherAddress() {
    if (addresses.length >= MAX_ADDRESSES) {
      setAddressError(`Podés guardar hasta ${MAX_ADDRESSES} direcciones.`);
      return;
    }

    setAddressForm(createEmptyAddressForm());
    setAddressError("");
  }

  async function handleSelectPrimaryAddress(addressId) {
    const selectedId = String(addressId || "").trim();
    if (!selectedId) {
      return;
    }

    const currentPrimaryId = getPrimaryAddressId(addresses);
    if (currentPrimaryId === selectedId) {
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        addresses,
        primaryAddressId: selectedId
      };

      let savedResult = null;
      if (typeof onSaveAddress === "function") {
        savedResult = await onSaveAddress(payload);
      } else {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 450);
        });
      }

      const persistedAddresses = Array.isArray(savedResult?.addressBook)
        ? savedResult.addressBook
          .map((entry, index) => normalizeAddressEntry(entry, `addr-${index + 1}`))
          .slice(0, MAX_ADDRESSES)
        : addresses;

      setAddresses(persistedAddresses);
      setSaveMessage("Dirección principal actualizada.");
      setAddressError("");
    } catch (error) {
      setAddressError(error?.message || "No se pudo actualizar la dirección principal.");
    } finally {
      setIsSaving(false);
    }
  }

  const avatarSource = String(form.avatarUrl || user?.avatarUrl || "").trim();
  const avatarInitials = getProfileInitials({
    firstName: form.firstName,
    lastName: form.lastName,
    displayName: form.displayName,
    email: user?.email
  });
  const shouldShowAvatarImage = Boolean(avatarSource) && !avatarLoadFailed;

  const maskedPassword = "••••••••";

  const adminStatus = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeAlerts = lowStockAlerts || {};
    const productAlerts = Array.isArray(safeAlerts.productAlerts) ? safeAlerts.productAlerts.length : 0;
    const variantAlerts = Array.isArray(safeAlerts.variantAlerts) ? safeAlerts.variantAlerts.length : 0;

    const newOrders = safeOrders.filter((order) => order?.status === "nuevo").length;
    const processingOrders = safeOrders.filter((order) => ["pago", "preparado", "enviado"].includes(order?.status)).length;

    return {
      newOrders,
      processingOrders,
      lowStockCount: productAlerts + variantAlerts
    };
  }, [lowStockAlerts, orders]);

  if (!user) {
    return (
      <section className="account-view" aria-label="Mi cuenta">
        <header className="account-view-header">
          <h1>Mi cuenta</h1>
          <button type="button" className="secondary-btn" onClick={onGoHome}>
            Volver al inicio
          </button>
        </header>

        <div className="account-empty-state">
          <p>Iniciá sesión para ver y editar tu cuenta.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="account-view" aria-label="Mi cuenta">
      <header className="account-view-header">
        <h1>Mi cuenta</h1>
        <div className="account-top-actions">
          <button type="button" className="secondary-btn" onClick={onGoHome}>
            Volver al inicio
          </button>
          <button type="button" className="secondary-btn" onClick={onGoCart}>
            Ir al carrito
          </button>
          {isAdmin && (
            <button type="button" className="secondary-btn" onClick={onGoAdmin}>
              Panel admin
            </button>
          )}
        </div>
      </header>

      {isAdmin && (
        <article className="account-admin-hero" aria-label="Cuenta con permisos de administrador">
          <div className="account-admin-hero-badge">Administrador</div>
          <h2>Esta cuenta tiene permisos especiales</h2>
          <p>
            Podés gestionar productos, pedidos, categorías y reglas comerciales. Los cambios impactan en todo el sitio.
          </p>

          <div className="account-admin-stats" aria-label="Estado operativo de administrador">
            <div className="account-admin-stat">
              <span>Pedidos nuevos</span>
              <strong>{adminStatus.newOrders}</strong>
            </div>
            <div className="account-admin-stat">
              <span>Pedidos en proceso</span>
              <strong>{adminStatus.processingOrders}</strong>
            </div>
            <div className="account-admin-stat">
              <span>Alertas de stock bajo</span>
              <strong>{adminStatus.lowStockCount}</strong>
            </div>
          </div>

          <div className="account-admin-hero-actions">
            <button type="button" className="secondary-btn" onClick={onGoAdmin}>
              Ir al panel admin
            </button>
          </div>
        </article>
      )}

      <nav className="account-tabs" aria-label="Secciones de mi cuenta">
        {ACCOUNT_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`account-tab ${activeTab === tab.key ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "tickets" ? (
        <TicketsPanel
          mode="client"
          tickets={tickets}
          metrics={ticketMetrics}
          currentUser={user}
          onCreateTicket={onCreateTicket}
          onAddComment={onAddTicketComment}
          onReloadTickets={onReloadTickets}
          isLoading={isTicketsLoading}
        />
      ) : activeTab === "direccion" ? (
        <article className="account-card account-address-card">
          <h2>Mi dirección</h2>
          <p>Completá tus datos de entrega. Solo realizamos envíos en zonas habilitadas de Buenos Aires y CABA.</p>

          <div className="account-form-grid">
            <div className="account-input-group">
              <label htmlFor="account-address-street">Dirección</label>
              <input
                id="account-address-street"
                type="text"
                placeholder="Calle"
                value={addressForm.street}
                onChange={(event) => handleAddressFieldChange("street", event.target.value)}
                required
              />
            </div>

            <div className="account-form-grid two-columns account-address-two-columns">
              <div className="account-input-group">
                <label htmlFor="account-address-height">Altura</label>
                <input
                  id="account-address-height"
                  type="text"
                  placeholder="Ej: 1121"
                  value={addressForm.height}
                  onChange={(event) => handleAddressFieldChange("height", event.target.value)}
                  required
                />
              </div>

              <div className="account-input-group">
                <label htmlFor="account-address-floor">Piso</label>
                <input
                  id="account-address-floor"
                  type="text"
                  placeholder="Ej: 3"
                  value={addressForm.floor}
                  onChange={(event) => handleAddressFieldChange("floor", event.target.value)}
                />
              </div>

              <div className="account-input-group">
                <label htmlFor="account-address-apartment">Departamento</label>
                <input
                  id="account-address-apartment"
                  type="text"
                  placeholder="Ej: B"
                  value={addressForm.apartment}
                  onChange={(event) => handleAddressFieldChange("apartment", event.target.value)}
                />
              </div>

              <div className="account-input-group">
                <label htmlFor="account-address-city">Ciudad</label>
                <input
                  id="account-address-city"
                  type="text"
                  value={addressForm.city}
                  onChange={(event) => handleAddressFieldChange("city", event.target.value)}
                />
              </div>

              <div className="account-input-group">
                <label htmlFor="account-address-region">Zona de envío</label>
                <select
                  id="account-address-region"
                  value={addressForm.region}
                  onChange={(event) => handleAddressFieldChange("region", event.target.value)}
                  required
                >
                  <option value="">Seleccioná una zona</option>
                  {SHIPPING_ZONES.map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>

              <div className="account-input-group">
                <label htmlFor="account-address-country">País / región</label>
                <input
                  id="account-address-country"
                  type="text"
                  value="Argentina"
                  disabled
                  readOnly
                />
              </div>

              <div className="account-input-group">
                <label htmlFor="account-address-postal-code">Código postal</label>
                <input
                  id="account-address-postal-code"
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: 1414"
                  value={addressForm.postalCode}
                  onChange={(event) => handleAddressFieldChange("postalCode", event.target.value)}
                  required
                />
              </div>

              <div className="account-input-group">
                <label htmlFor="account-address-phone">Teléfono</label>
                <input
                  id="account-address-phone"
                  type="tel"
                  placeholder="Ej: 01140486698"
                  value={addressForm.phone}
                  onChange={(event) => handleAddressFieldChange("phone", event.target.value)}
                />
              </div>
            </div>

            {addressError ? <p className="form-error">{addressError}</p> : null}
          </div>

          <div className="account-actions-inline">
            <button type="button" className="ghost-btn" onClick={handleAddAnotherAddress} disabled={isSaving || addresses.length >= MAX_ADDRESSES}>
              Agregar otra dirección
            </button>
            <button type="button" className="ghost-btn" onClick={handleDiscardAddress} disabled={isSaving}>
              Descartar
            </button>
            <button type="button" onClick={handleSaveAddress} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar dirección"}
            </button>
          </div>

          {saveMessage && <p className="account-save-message">{saveMessage}</p>}

          <section className="account-address-list" aria-label="Direcciones guardadas">
            {addresses.length ? (
              addresses.map((address) => {
                const isPrimary = getPrimaryAddressId(addresses) === address.id;

                return (
                  <article key={address.id} className={`account-address-item ${isPrimary ? "is-primary" : ""}`}>
                    <div>
                      <h3>{formatAddressHeadline(address) || "Dirección sin completar"}</h3>
                      <p>{formatAddressDetails(address) || "Completá los datos faltantes."}</p>
                    </div>
                    <button
                      type="button"
                      className={isPrimary ? "ghost-btn" : ""}
                      disabled={isSaving || isPrimary}
                      onClick={() => handleSelectPrimaryAddress(address.id)}
                    >
                      {isPrimary ? "Dirección principal" : "Enviar a esta dirección"}
                    </button>
                  </article>
                );
              })
            ) : (
              <p className="account-address-empty">Todavía no guardaste direcciones.</p>
            )}
          </section>

          <p className="account-address-coverage-note">
            Cobertura habilitada en 39 zonas: CABA, GBA norte/oeste/sur, La Plata y alrededores, y corredores seleccionados.
          </p>
        </article>
      ) : activeTab !== "cuenta" ? (
        <article className="account-card">
          <h2>{ACCOUNT_TABS.find((tab) => tab.key === activeTab)?.label}</h2>
          <p>
            Esta sección queda lista para conectar con backend cuando quieras. Ya está preparada dentro de tu panel de cuenta.
          </p>
          <ul className="account-summary-list">
            <li>
              <span>Productos en carrito</span>
              <strong>{totalItems}</strong>
            </li>
            <li>
              <span>Subtotal actual</span>
              <strong>${cartSubtotal.toLocaleString("es-AR")} ARS</strong>
            </li>
          </ul>
        </article>
      ) : (
        <>
          <section className="account-section-headline">
            <h2>Cuenta</h2>
            <p>Mirá y editá tu información personal.</p>
          </section>

          <div className="account-actions-bar">
            <button type="button" className="ghost-btn" onClick={handleDiscard} disabled={isSaving}>
              Descartar
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Actualizando..." : "Actualizar información"}
            </button>
          </div>

          {saveMessage && <p className="account-save-message">{saveMessage}</p>}
          {profileError ? <p className="form-error">{profileError}</p> : null}

          <article className="account-card">
            <h3>Información personal</h3>
            <p>Actualizá tu información personal y cómo se muestra tu perfil.</p>

            <div className="account-form-grid two-columns">
              <div className="account-input-group">
                <label htmlFor="account-display-name">Nombre visible</label>
                <input
                  id="account-display-name"
                  type="text"
                  value={form.displayName}
                  onChange={(event) => handleFieldChange("displayName", event.target.value)}
                />
              </div>

              <div className="account-avatar-group account-avatar-card">
                <p>Imagen de perfil</p>
                {shouldShowAvatarImage ? (
                  <img
                    src={avatarSource}
                    alt="Avatar de cuenta"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <div className="account-avatar-fallback" aria-label="Iniciales del perfil">
                    {avatarInitials}
                  </div>
                )}
              </div>

              <div className="account-input-group">
                <label htmlFor="account-profile-title">Título</label>
                <input
                  id="account-profile-title"
                  type="text"
                  value={form.profileTitle}
                  onChange={(event) => handleFieldChange("profileTitle", event.target.value)}
                />
              </div>

              <div className="account-input-group">
                <label htmlFor="account-avatar-url">URL de imagen</label>
                <input
                  id="account-avatar-url"
                  type="url"
                  placeholder="https://..."
                  value={form.avatarUrl}
                  onChange={(event) => handleFieldChange("avatarUrl", event.target.value)}
                />
              </div>

              <div className="account-input-group">
                <label htmlFor="account-first-name">Nombre</label>
                <input
                  id="account-first-name"
                  type="text"
                  value={form.firstName}
                  onChange={(event) => handleFieldChange("firstName", event.target.value)}
                />
              </div>

              <div className="account-input-group">
                <label htmlFor="account-last-name">Apellido</label>
                <input
                  id="account-last-name"
                  type="text"
                  value={form.lastName}
                  onChange={(event) => handleFieldChange("lastName", event.target.value)}
                />
              </div>

              <div className="account-input-group">
                <label htmlFor="account-phone">Teléfono</label>
                <input
                  id="account-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => handleFieldChange("phone", event.target.value)}
                />
              </div>
            </div>

            <div className="account-actions-inline">
              <button type="button" className="ghost-btn" onClick={handleDiscard} disabled={isSaving}>
                Descartar
              </button>
              <button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Actualizando..." : "Actualizar información"}
              </button>
            </div>
          </article>

          <article className="account-card">
            <h3>Información de inicio de sesión</h3>
            <p>Revisá tu email de acceso y contraseña actual.</p>

            <div className="account-login-info">
              <div>
                <span>Email de inicio de sesión</span>
                <strong>{user.email || "Sin email"}</strong>
              </div>
              <div>
                <span>Contraseña</span>
                <strong>{maskedPassword}</strong>
              </div>
            </div>
          </article>

          <article className="account-card">
            <h3>Visibilidad y privacidad</h3>
            <p>Configurá cómo se muestra tu perfil.</p>

            <div className="account-input-group">
              <label htmlFor="account-visibility">Privacidad del perfil</label>
              <select
                id="account-visibility"
                value={form.profileVisibility}
                onChange={(event) => handleFieldChange("profileVisibility", event.target.value)}
              >
                <option value="visible">Perfil visible para miembros</option>
                <option value="limited">Visible solo nombre y foto</option>
                <option value="hidden">Perfil privado</option>
              </select>
            </div>

            <button
              type="button"
              className="account-collapse"
              onClick={() => setIsPrivacyOpen((current) => !current)}
              aria-expanded={isPrivacyOpen}
            >
              <span>Privacidad del perfil</span>
              <span>{isPrivacyOpen ? "−" : "+"}</span>
            </button>
            {isPrivacyOpen && (
              <p className="account-collapse-content">
                Definí si tus datos de perfil se muestran completos, parcialmente o no se muestran.
              </p>
            )}

            <button
              type="button"
              className="account-collapse"
              onClick={() => setIsBlockedOpen((current) => !current)}
              aria-expanded={isBlockedOpen}
            >
              <span>Miembros bloqueados</span>
              <span>{isBlockedOpen ? "−" : "+"}</span>
            </button>
            {isBlockedOpen && (
              <p className="account-collapse-content">Aún no tenés miembros bloqueados.</p>
            )}
          </article>
        </>
      )}
    </section>
  );
}
