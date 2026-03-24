import { useEffect, useMemo, useState } from "react";
import TicketsPanel from "./TicketsPanel";
import { forgotPassword, resetPassword } from "../api";

const ACCOUNT_TABS = [
  { key: "cuenta", label: "Mi cuenta" },
  { key: "pedidos", label: "Mis pedidos" },
  { key: "direccion", label: "Mi dirección" },
  { key: "favoritos", label: "Productos favoritos", mobileOnly: true }
];

const SHIPPING_ZONES = [
  "CABA",
  "Almirante Brown",
  "Avellaneda",
  "Berazategui",
  "Berisso",
  "Campana",
  "Cañuelas",
  "Ensenada",
  "Escobar",
  "Esteban Echeverría",
  "Ezeiza",
  "Florencio Varela",
  "General Rodríguez",
  "Guernica",
  "Hurlingham",
  "Ituzaingó",
  "José C. Paz",
  "La Matanza Norte",
  "La Matanza Sur",
  "La Plata",
  "Lanús",
  "Lomas de Zamora",
  "Luján",
  "Malvinas Argentinas",
  "Marcos Paz",
  "Merlo",
  "Moreno",
  "Morón",
  "Pilar",
  "Quilmes",
  "San Fernando",
  "San Isidro",
  "San Martín",
  "San Miguel",
  "San Vicente",
  "Tigre",
  "Tres de Febrero",
  "Vicente López",
  "Zárate"
];

const GBA_DISTRICTS = SHIPPING_ZONES.filter((z) => z !== "CABA");

const BARRIOS_CABA = [
  "Agronomía", "Almagro", "Balvanera", "Barracas", "Belgrano", "Boedo",
  "Caballito", "Chacarita", "Coghlan", "Colegiales", "Constitución", "Devoto",
  "Flores", "Floresta", "La Boca", "La Paternal", "Liniers", "Mataderos",
  "Monte Castro", "Montserrat", "Nueva Pompeya", "Núñez", "Palermo",
  "Parque Avellaneda", "Parque Chacabuco", "Parque Chas", "Parque Patricios",
  "Puerto Madero", "Recoleta", "Retiro", "Saavedra", "San Cristóbal",
  "San Nicolás", "San Telmo", "Vélez Sarsfield", "Versalles",
  "Villa Crespo", "Villa del Parque", "Villa Devoto", "Villa General Mitre",
  "Villa Lugano", "Villa Luro", "Villa Ortúzar", "Villa Pueyrredón",
  "Villa Real", "Villa Riachuelo", "Villa Santa Rita", "Villa Soldati", "Villa Urquiza"
];

const MAX_ADDRESSES = 5;

const ZONE_BADGES = {
  CABA: { label: "CABA", color: "#2563eb", bg: "#eff6ff" },
  default: { label: "GBA", color: "#059669", bg: "#ecfdf5" }
};

function getZoneBadge(region) {
  const r = String(region || "").trim();
  if (r === "CABA") return ZONE_BADGES.CABA;
  if (r) return { ...ZONE_BADGES.default, label: r };
  return null;
}

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
    city: "",
    region: "",
    province: "",
    barrio: "",
    district: "",
    country: "Argentina",
    postalCode: "",
    phone: "",
    deliveryNotes: "",
    addressType: "residencial"
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
    city: String(entry?.city || "").trim(),
    region: String(entry?.region || "").trim(),
    province: String(entry?.province || "").trim(),
    barrio: String(entry?.barrio || "").trim(),
    district: String(entry?.district || "").trim(),
    country: "Argentina",
    postalCode: String(entry?.postalCode || "").trim(),
    phone: String(entry?.phone || "").trim(),
    deliveryNotes: String(entry?.deliveryNotes || "").trim(),
    addressType: String(entry?.addressType || "residencial").trim()
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
    address?.barrio || "",
    address?.district && address.district !== address.region ? address.district : "",
    address?.city ? `Ciudad: ${address.city}` : "",
    address?.region ? `Zona: ${address.region}` : "",
    address?.postalCode ? `CP: ${address.postalCode}` : "",
    address?.addressType === "laboral" ? "Laboral" : ""
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

function capitalizeWords(str) {
  const s = String(str || "").trim();
  if (!s) return s;
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function createProfileForm(user) {
  const firstName = String(user?.firstName || "").trim();
  const lastName = String(user?.lastName || "").trim();
  const fallbackNameParts = splitName(user?.name);

  return {
    displayName: capitalizeWords(user?.name || ""),
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

const ORDER_STATUS_LABELS = {
  nuevo: "Nuevo",
  pago: "Pagado",
  confirmado: "Confirmado",
  preparado: "Preparado",
  listo_retiro: "Listo para retiro",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado"
};

const ORDER_STATUS_TONE = {
  nuevo: "pending",
  pago: "success",
  confirmado: "success",
  preparado: "info",
  listo_retiro: "info",
  enviado: "info",
  entregado: "done",
  cancelado: "danger"
};

export default function AccountPanel({
  user,
  initialTab = "cuenta",
  isAdmin,
  totalItems,
  cartSubtotal,
  orders,
  myOrders = [],
  isMyOrdersLoading = false,
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
  onSaveAddress,
  onRepeatOrder
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isBlockedOpen, setIsBlockedOpen] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressFieldErrors, setAddressFieldErrors] = useState({});
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  // ── Password change flow ──
  const [pwStep, setPwStep] = useState("idle"); // idle | sent | done
  const [pwCode, setPwCode] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

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
    setAddressFieldErrors({});
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
      const capitalize = (str) => {
        const s = String(str || "").trim();
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
      };

      const payload = {
        displayName: String(form.displayName || "").trim(),
        firstName: capitalize(form.firstName),
        lastName: capitalize(form.lastName),
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
    const normalizedProvince = String(addressForm.province || "").trim();
    const normalizedBarrio = String(addressForm.barrio || "").trim();
    const normalizedDistrict = String(addressForm.district || "").trim();
    const normalizedPhone = String(addressForm.phone || "").trim();
    const normalizedDeliveryNotes = String(addressForm.deliveryNotes || "").trim();
    const normalizedAddressType = addressForm.addressType || "residencial";

    // Derive region and city from province selection
    const derivedRegion = normalizedProvince === "caba" ? "CABA" : normalizedDistrict;
    const derivedCity = normalizedProvince === "caba" ? "Buenos Aires" : normalizedDistrict || "Buenos Aires";

    if (!normalizedStreet) {
      setAddressFieldErrors({ street: true });
      setAddressError("La dirección es obligatoria.");
      return;
    }

    if (!normalizedHeight) {
      setAddressFieldErrors({ height: true });
      setAddressError("La altura es obligatoria.");
      return;
    }

    if (!normalizedPostalCode) {
      setAddressFieldErrors({ postalCode: true });
      setAddressError("El código postal es obligatorio.");
      return;
    }

    if (!normalizedProvince) {
      setAddressFieldErrors({ province: true });
      setAddressError("Seleccioná una provincia.");
      return;
    }

    if (normalizedProvince === "caba" && !normalizedBarrio) {
      setAddressFieldErrors({ barrio: true });
      setAddressError("Seleccioná un barrio.");
      return;
    }

    if (normalizedProvince === "pba" && !normalizedDistrict) {
      setAddressFieldErrors({ district: true });
      setAddressError("Seleccioná un distrito.");
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
        city: derivedCity,
        region: derivedRegion,
        province: normalizedProvince,
        barrio: normalizedBarrio,
        district: normalizedDistrict,
        country: "Argentina",
        postalCode: normalizedPostalCode,
        phone: normalizedPhone,
        deliveryNotes: normalizedDeliveryNotes,
        addressType: normalizedAddressType
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
      setIsAddressFormOpen(false);
      setEditingAddressId(null);
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
    setAddressFieldErrors({});
    setIsAddressFormOpen(false);
    setEditingAddressId(null);
    setSaveMessage("");
  }

  function handleOpenAddForm() {
    if (addresses.length >= MAX_ADDRESSES) {
      setAddressError(`Podés guardar hasta ${MAX_ADDRESSES} direcciones.`);
      return;
    }
    setAddressForm(createEmptyAddressForm());
    setAddressError("");
    setAddressFieldErrors({});
    setEditingAddressId(null);
    setIsAddressFormOpen(true);
  }

  function handleEditAddress(addressId) {
    const addr = addresses.find((a) => a.id === addressId);
    if (!addr) return;
    setAddressForm({
      street: addr.street || "",
      height: addr.height || "",
      floor: addr.floor || "",
      apartment: addr.apartment || "",
      city: addr.city || "",
      region: addr.region || "",
      province: addr.province || (addr.region === "CABA" ? "caba" : addr.region ? "pba" : ""),
      barrio: addr.barrio || "",
      district: addr.district || (addr.region && addr.region !== "CABA" ? addr.region : ""),
      country: "Argentina",
      postalCode: addr.postalCode || "",
      phone: addr.phone || "",
      deliveryNotes: addr.deliveryNotes || "",
      addressType: addr.addressType || "residencial"
    });
    setEditingAddressId(addressId);
    setIsAddressFormOpen(true);
    setAddressError("");
    setAddressFieldErrors({});
  }

  async function handleUpdateAddress() {
    const normalizedStreet = String(addressForm.street || "").trim();
    const normalizedHeight = String(addressForm.height || "").trim();
    const normalizedProvince = String(addressForm.province || "").trim();
    const normalizedBarrio = String(addressForm.barrio || "").trim();
    const normalizedDistrict = String(addressForm.district || "").trim();
    const normalizedPostalCode = String(addressForm.postalCode || "").trim();

    const derivedRegion = normalizedProvince === "caba" ? "CABA" : normalizedDistrict;
    const derivedCity = normalizedProvince === "caba" ? "Buenos Aires" : normalizedDistrict || "Buenos Aires";

    if (!normalizedStreet) { setAddressFieldErrors({ street: true }); setAddressError("La dirección es obligatoria."); return; }
    if (!normalizedHeight) { setAddressFieldErrors({ height: true }); setAddressError("La altura es obligatoria."); return; }
    if (!normalizedPostalCode) { setAddressFieldErrors({ postalCode: true }); setAddressError("El código postal es obligatorio."); return; }
    if (!normalizedProvince) { setAddressFieldErrors({ province: true }); setAddressError("Seleccioná una provincia."); return; }
    if (normalizedProvince === "caba" && !normalizedBarrio) { setAddressFieldErrors({ barrio: true }); setAddressError("Seleccioná un barrio."); return; }
    if (normalizedProvince === "pba" && !normalizedDistrict) { setAddressFieldErrors({ district: true }); setAddressError("Seleccioná un distrito."); return; }

    setIsSaving(true);
    try {
      const updatedAddress = normalizeAddressEntry({
        id: editingAddressId,
        street: normalizedStreet,
        height: normalizedHeight,
        floor: String(addressForm.floor || "").trim(),
        apartment: String(addressForm.apartment || "").trim(),
        city: derivedCity,
        region: derivedRegion,
        province: normalizedProvince,
        barrio: normalizedBarrio,
        district: normalizedDistrict,
        country: "Argentina",
        postalCode: normalizedPostalCode,
        phone: String(addressForm.phone || "").trim(),
        deliveryNotes: String(addressForm.deliveryNotes || "").trim(),
        addressType: addressForm.addressType || "residencial"
      });

      const nextAddresses = addresses.map((a) => a.id === editingAddressId ? updatedAddress : a);
      const nextPrimaryId = getPrimaryAddressId(nextAddresses);
      const payload = { addresses: nextAddresses, primaryAddressId: nextPrimaryId };

      let savedResult = null;
      if (typeof onSaveAddress === "function") { savedResult = await onSaveAddress(payload); }

      const persistedAddresses = Array.isArray(savedResult?.addressBook)
        ? savedResult.addressBook.map((entry, i) => normalizeAddressEntry(entry, `addr-${i + 1}`)).slice(0, MAX_ADDRESSES)
        : nextAddresses;

      setAddresses(persistedAddresses);
      setAddressForm(createEmptyAddressForm());
      setIsAddressFormOpen(false);
      setEditingAddressId(null);
      setSaveMessage("Dirección actualizada correctamente.");
      setAddressError("");
      setAddressFieldErrors({});
    } catch (error) {
      setAddressError(error?.message || "No se pudo actualizar la dirección.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAddress(addressId) {
    setIsSaving(true);
    try {
      const nextAddresses = addresses.filter((a) => a.id !== addressId);
      const nextPrimaryId = nextAddresses.length ? getPrimaryAddressId(nextAddresses) : "";
      const payload = { addresses: nextAddresses, primaryAddressId: nextPrimaryId };

      let savedResult = null;
      if (typeof onSaveAddress === "function") { savedResult = await onSaveAddress(payload); }

      const persistedAddresses = Array.isArray(savedResult?.addressBook)
        ? savedResult.addressBook.map((entry, i) => normalizeAddressEntry(entry, `addr-${i + 1}`)).slice(0, MAX_ADDRESSES)
        : nextAddresses;

      setAddresses(persistedAddresses);
      setDeleteConfirmId(null);
      setSaveMessage("Dirección eliminada.");
      setAddressError("");
    } catch (error) {
      setAddressError(error?.message || "No se pudo eliminar la dirección.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleAddAnotherAddress() {
    if (addresses.length >= MAX_ADDRESSES) {
      setAddressError(`Podés guardar hasta ${MAX_ADDRESSES} direcciones.`);
      return;
    }

    setAddressForm(createEmptyAddressForm());
    setAddressError("");
    setAddressFieldErrors({});
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
      setAddressFieldErrors({});
    } catch (error) {
      setAddressError(error?.message || "No se pudo actualizar la dirección principal.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRequestPasswordChange() {
    setPwError("");
    setPwLoading(true);
    try {
      await forgotPassword(user.email);
      setPwStep("sent");
    } catch (err) {
      setPwError(err.message || "No se pudo enviar el código.");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleConfirmPasswordChange() {
    setPwError("");
    const code = pwCode.trim();
    const newPw = pwNew.trim();
    const confirmPw = pwConfirm.trim();

    if (!code) { setPwError("Ingresá el código que recibiste."); return; }
    if (newPw.length < 6) { setPwError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (newPw !== confirmPw) { setPwError("Las contraseñas no coinciden."); return; }

    setPwLoading(true);
    try {
      await resetPassword(user.email, code, newPw);
      setPwStep("done");
      setPwSuccess("Contraseña actualizada correctamente.");
      setPwCode("");
      setPwNew("");
      setPwConfirm("");
    } catch (err) {
      setPwError(err.message || "No se pudo actualizar la contraseña.");
    } finally {
      setPwLoading(false);
    }
  }

  function handleCancelPasswordChange() {
    setPwStep("idle");
    setPwCode("");
    setPwNew("");
    setPwConfirm("");
    setPwError("");
    setPwSuccess("");
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
            className={`account-tab ${activeTab === tab.key ? "is-active" : ""} ${tab.mobileOnly ? "account-tab-mobile-only" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "direccion" ? (
        <article className="account-card account-address-card">
          <div className="addr-section-header">
            <div>
              <h2>Mis direcciones</h2>
              <p className="addr-section-subtitle">Gestioná tus direcciones de entrega. Máximo {MAX_ADDRESSES} direcciones.</p>
            </div>
            <span className="addr-counter">{addresses.length}/{MAX_ADDRESSES}</span>
          </div>

          {/* ── Saved addresses list ── */}
          <section className="addr-list" aria-label="Direcciones guardadas">
            {addresses.length ? (
              addresses.map((address) => {
                const isPrimary = getPrimaryAddressId(addresses) === address.id;
                const badge = getZoneBadge(address.region);
                const isDeleting = deleteConfirmId === address.id;

                return (
                  <article key={address.id} className={`addr-card${isPrimary ? " addr-card--primary" : ""}`}>
                    <div className="addr-card-icon">
                      <svg viewBox="0 0 24 24" width="22" height="22"><path fill={isPrimary ? "#1877f2" : "#9ca3af"} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7m0 9.5A2.5 2.5 0 0 1 9.5 9 2.5 2.5 0 0 1 12 6.5 2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5"/></svg>
                    </div>
                    <div className="addr-card-body">
                      <div className="addr-card-top">
                        <h3>{formatAddressHeadline(address) || "Dirección sin completar"}</h3>
                        {isPrimary && <span className="addr-badge addr-badge--primary">Principal</span>}
                        {badge && <span className="addr-badge" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>}
                      </div>
                      <p className="addr-card-details">{formatAddressDetails(address) || "Completá los datos faltantes."}</p>
                    </div>
                    <div className="addr-card-actions">
                      {!isPrimary && !isDeleting && (
                        <button type="button" className="addr-action-btn addr-action-primary" disabled={isSaving} onClick={() => handleSelectPrimaryAddress(address.id)} title="Marcar como principal">
                          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                        </button>
                      )}
                      <button type="button" className="addr-action-btn addr-action-edit" disabled={isSaving} onClick={() => handleEditAddress(address.id)} title="Editar dirección">
                        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      </button>
                      {!isDeleting ? (
                        <button type="button" className="addr-action-btn addr-action-delete" disabled={isSaving} onClick={() => setDeleteConfirmId(address.id)} title="Eliminar dirección">
                          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                      ) : (
                        <div className="addr-delete-confirm">
                          <span>¿Eliminar?</span>
                          <button type="button" className="addr-confirm-yes" disabled={isSaving} onClick={() => handleDeleteAddress(address.id)}>Sí</button>
                          <button type="button" className="addr-confirm-no" onClick={() => setDeleteConfirmId(null)}>No</button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="addr-empty">
                <svg viewBox="0 0 24 24" width="40" height="40"><path fill="#d1d5db" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7m0 9.5A2.5 2.5 0 0 1 9.5 9 2.5 2.5 0 0 1 12 6.5 2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5"/></svg>
                <p>Todavía no guardaste direcciones.</p>
                <small>Agregá tu primera dirección de entrega.</small>
              </div>
            )}
          </section>

          {saveMessage && <p className="account-save-message">{saveMessage}</p>}
          {addressError && !Object.values(addressFieldErrors).some(Boolean) && !isAddressFormOpen ? <p className="form-error">{addressError}</p> : null}

          {/* ── Add / Edit form ── */}
          {!isAddressFormOpen ? (
            <button type="button" className="addr-add-btn" onClick={handleOpenAddForm} disabled={isSaving || addresses.length >= MAX_ADDRESSES}>
              <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              Agregar nueva dirección
            </button>
          ) : (
            <div className="addr-form-wrapper">
              <div className="addr-form-header">
                <h3>{editingAddressId ? "Editar dirección" : "Nueva dirección"}</h3>
                <button type="button" className="addr-form-close" onClick={handleDiscardAddress}>
                  <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>

              <div className="account-form-grid">
                {/* DIRECCIÓN */}
                <div className="account-input-group">
                  <label htmlFor="account-address-street">Dirección o lugar de entrega *</label>
                  <input id="account-address-street" type="text" placeholder="Ej: Av. Corrientes" className={addressFieldErrors.street ? "input-error" : ""} value={addressForm.street} onChange={(e) => { handleAddressFieldChange("street", e.target.value); setAddressFieldErrors((p) => ({ ...p, street: false })); }} required />
                  {addressFieldErrors.street && <span className="field-error-msg">La dirección es obligatoria.</span>}
                </div>

                <div className="account-form-grid two-columns account-address-two-columns">
                  {/* ALTURA */}
                  <div className="account-input-group">
                    <label htmlFor="account-address-height">Altura *</label>
                    <input id="account-address-height" type="text" placeholder="Ej: 1121" className={addressFieldErrors.height ? "input-error" : ""} value={addressForm.height} onChange={(e) => { handleAddressFieldChange("height", e.target.value); setAddressFieldErrors((p) => ({ ...p, height: false })); }} required />
                    {addressFieldErrors.height && <span className="field-error-msg">La altura es obligatoria.</span>}
                  </div>

                  {/* CÓDIGO POSTAL */}
                  <div className="account-input-group">
                    <label htmlFor="account-address-postal-code">Código postal *</label>
                    <input id="account-address-postal-code" type="text" inputMode="numeric" placeholder="Ej: 1414" className={addressFieldErrors.postalCode ? "input-error" : ""} value={addressForm.postalCode} onChange={(e) => { handleAddressFieldChange("postalCode", e.target.value); setAddressFieldErrors((p) => ({ ...p, postalCode: false })); }} required />
                    {addressFieldErrors.postalCode && <span className="field-error-msg">El código postal es obligatorio.</span>}
                  </div>

                  {/* PROVINCIA */}
                  <div className="account-input-group">
                    <label htmlFor="account-address-province">Provincia *</label>
                    <select id="account-address-province" className={addressFieldErrors.province ? "input-error" : ""} value={addressForm.province} onChange={(e) => { const val = e.target.value; handleAddressFieldChange("province", val); setAddressFieldErrors((p) => ({ ...p, province: false, barrio: false, district: false })); if (val === "caba") { handleAddressFieldChange("district", ""); handleAddressFieldChange("city", "Buenos Aires"); } else if (val === "pba") { handleAddressFieldChange("barrio", ""); } else { handleAddressFieldChange("barrio", ""); handleAddressFieldChange("district", ""); } }} required>
                      <option value="">Seleccioná una provincia</option>
                      <option value="caba">Capital Federal (CABA)</option>
                      <option value="pba">Provincia de Buenos Aires</option>
                    </select>
                    {addressFieldErrors.province && <span className="field-error-msg">Seleccioná una provincia.</span>}
                  </div>

                  {/* BARRIO CABA */}
                  {addressForm.province === "caba" && (
                    <div className="account-input-group">
                      <label htmlFor="account-address-barrio">Barrio *</label>
                      <select id="account-address-barrio" className={addressFieldErrors.barrio ? "input-error" : ""} value={addressForm.barrio} onChange={(e) => { handleAddressFieldChange("barrio", e.target.value); setAddressFieldErrors((p) => ({ ...p, barrio: false })); }} required>
                        <option value="">Seleccioná un barrio</option>
                        {BARRIOS_CABA.map((b) => (<option key={b} value={b}>{b}</option>))}
                      </select>
                      {addressFieldErrors.barrio && <span className="field-error-msg">Seleccioná un barrio.</span>}
                    </div>
                  )}

                  {/* DISTRITO GBA */}
                  {addressForm.province === "pba" && (
                    <div className="account-input-group">
                      <label htmlFor="account-address-district">Distrito *</label>
                      <select id="account-address-district" className={addressFieldErrors.district ? "input-error" : ""} value={addressForm.district} onChange={(e) => { handleAddressFieldChange("district", e.target.value); setAddressFieldErrors((p) => ({ ...p, district: false })); }} required>
                        <option value="">Seleccioná un distrito</option>
                        {GBA_DISTRICTS.map((d) => (<option key={d} value={d}>{d}</option>))}
                      </select>
                      {addressFieldErrors.district && <span className="field-error-msg">Seleccioná un distrito.</span>}
                    </div>
                  )}

                  {/* PISO */}
                  <div className="account-input-group">
                    <label htmlFor="account-address-floor">Piso</label>
                    <input id="account-address-floor" type="text" placeholder="Ej: 3 (opcional)" value={addressForm.floor} onChange={(e) => handleAddressFieldChange("floor", e.target.value)} />
                  </div>

                  {/* DEPARTAMENTO */}
                  <div className="account-input-group">
                    <label htmlFor="account-address-apartment">Departamento</label>
                    <input id="account-address-apartment" type="text" placeholder="Ej: B (opcional)" value={addressForm.apartment} onChange={(e) => handleAddressFieldChange("apartment", e.target.value)} />
                  </div>

                  {/* INDICACIONES PARA LA ENTREGA */}
                  <div className="account-input-group account-input-full-width">
                    <label htmlFor="account-address-delivery-notes">Indicaciones para la entrega</label>
                    <input id="account-address-delivery-notes" type="text" placeholder="Ej: Timbre 4B, portón negro (opcional)" value={addressForm.deliveryNotes} onChange={(e) => handleAddressFieldChange("deliveryNotes", e.target.value)} />
                  </div>

                  {/* TIPO DE DOMICILIO */}
                  <div className="account-input-group account-input-full-width">
                    <label>Tipo de domicilio</label>
                    <div className="account-address-type-row">
                      <button type="button" className={`account-address-type-btn${addressForm.addressType === "residencial" ? " is-active" : ""}`} onClick={() => handleAddressFieldChange("addressType", "residencial")}>
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                        Residencial
                      </button>
                      <button type="button" className={`account-address-type-btn${addressForm.addressType === "laboral" ? " is-active" : ""}`} onClick={() => handleAddressFieldChange("addressType", "laboral")}>
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2M10 4h4v2h-4z"/></svg>
                        Laboral
                      </button>
                    </div>
                  </div>
                </div>

                {addressError && !Object.values(addressFieldErrors).some(Boolean) ? <p className="form-error">{addressError}</p> : null}
              </div>

              <div className="addr-form-actions">
                <button type="button" className="addr-cancel-btn" onClick={handleDiscardAddress} disabled={isSaving}>Cancelar</button>
                <button type="button" className="addr-save-btn" onClick={editingAddressId ? handleUpdateAddress : handleSaveAddress} disabled={isSaving}>
                  {isSaving ? "Guardando..." : editingAddressId ? "Guardar cambios" : "Guardar dirección"}
                </button>
              </div>
            </div>
          )}

          <p className="account-address-coverage-note">
            Cobertura habilitada en 39 zonas: CABA, GBA norte/oeste/sur, La Plata y alrededores, y corredores seleccionados.
          </p>
        </article>
      ) : activeTab === "pedidos" ? (
        <article className="account-card account-orders-card">
          <div className="account-orders-header">
            <h2>Mis pedidos</h2>
            {isMyOrdersLoading && <span className="account-orders-loading">Cargando…</span>}
          </div>

          {!isMyOrdersLoading && myOrders.length === 0 && (
            <div className="account-empty-state">
              <span className="account-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 48 48" fill="none">
                  <rect x="10" y="6" width="28" height="36" rx="4" stroke="currentColor" strokeWidth="2.2"/>
                  <path d="M18 16h12M18 23h12M18 30h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              <p>Todavía no realizaste pedidos.</p>
              <button type="button" onClick={onGoHome}>Ver productos</button>
            </div>
          )}

          {!isMyOrdersLoading && myOrders.length > 0 && (
            <ul className="account-orders-list">
              {myOrders.map((order) => {
                const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;
                const statusTone = ORDER_STATUS_TONE[order.status] || "pending";
                const dateStr = order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
                  : "";
                const canRepeat = order.lines.some((l) => l.productId);

                return (
                  <li key={order.id} className="account-order-item">
                    <div className="account-order-top">
                      <div className="account-order-meta">
                        <span className="account-order-number">Pedido #{order.wixOrderNumber || order.id}</span>
                        <span className="account-order-date">{dateStr}</span>
                      </div>
                      <span className={`account-order-badge tone-${statusTone}`}>{statusLabel}</span>
                    </div>

                    <ul className="account-order-lines">
                      {order.lines.map((line, idx) => (
                        <li key={idx} className="account-order-line">
                          <span className="account-order-line-name">
                            {line.productName}
                            {line.variant ? <em> · {line.variant}</em> : null}
                          </span>
                          <span className="account-order-line-qty">×{line.quantity}</span>
                          <span className="account-order-line-price">${Number(line.unitPrice).toLocaleString("es-AR")} c/u</span>
                        </li>
                      ))}
                    </ul>

                    <div className="account-order-bottom">
                      <span className="account-order-total">
                        Total: <strong>${Number(order.total).toLocaleString("es-AR")} ARS</strong>
                      </span>
                      {canRepeat && (
                        <button
                          type="button"
                          className="account-order-repeat-btn"
                          onClick={() => onRepeatOrder?.(order)}
                          title="Agregar estos productos al carrito"
                        >
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 4h9a3 3 0 0 1 3 3v.5" />
                            <path d="M14 10.5l2-2 2 2" />
                            <path d="M16 16H7a3 3 0 0 1-3-3v-.5" />
                            <path d="M6 9.5l-2 2-2-2" />
                          </svg>
                          Repetir pedido
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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

              <div className="account-password-row">
                <div className="account-password-info">
                  <span>Contraseña</span>
                  <strong>{maskedPassword}</strong>
                </div>

                {pwStep === "idle" && (
                  <button
                    type="button"
                    className="account-pw-trigger-btn"
                    onClick={handleRequestPasswordChange}
                    disabled={pwLoading}
                  >
                    {pwLoading ? "Enviando..." : "Cambiar contraseña"}
                  </button>
                )}
              </div>

              {pwStep === "sent" && (
                <div className="account-pw-form">
                  <p className="account-pw-hint">
                    Te enviamos un código a <strong>{user.email}</strong>. Ingresalo abajo junto con tu nueva contraseña.
                  </p>
                  <div className="account-pw-fields">
                    <div className="account-input-group">
                      <label htmlFor="pw-code">Código de verificación</label>
                      <input
                        id="pw-code"
                        type="text"
                        inputMode="numeric"
                        placeholder="Ej: 483920"
                        value={pwCode}
                        onChange={(e) => { setPwError(""); setPwCode(e.target.value); }}
                        autoComplete="one-time-code"
                      />
                    </div>
                    <div className="account-input-group">
                      <label htmlFor="pw-new">Nueva contraseña</label>
                      <div className="pw-input-wrap">
                        <input
                          id="pw-new"
                          type={showPwNew ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          value={pwNew}
                          onChange={(e) => { setPwError(""); setPwNew(e.target.value); }}
                          autoComplete="new-password"
                        />
                        <button type="button" className="pw-eye-btn" onClick={() => setShowPwNew(v => !v)} tabIndex={-1} aria-label={showPwNew ? "Ocultar contraseña" : "Mostrar contraseña"}>
                          {showPwNew ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="account-input-group">
                      <label htmlFor="pw-confirm">Repetir contraseña</label>
                      <div className="pw-input-wrap">
                        <input
                          id="pw-confirm"
                          type={showPwConfirm ? "text" : "password"}
                          placeholder="Repetí la nueva contraseña"
                          value={pwConfirm}
                          onChange={(e) => { setPwError(""); setPwConfirm(e.target.value); }}
                          autoComplete="new-password"
                        />
                        <button type="button" className="pw-eye-btn" onClick={() => setShowPwConfirm(v => !v)} tabIndex={-1} aria-label={showPwConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}>
                          {showPwConfirm ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  {pwError && <p className="form-error">{pwError}</p>}
                  <div className="account-pw-actions">
                    <button type="button" className="ghost-btn" onClick={handleCancelPasswordChange} disabled={pwLoading}>
                      Cancelar
                    </button>
                    <button type="button" onClick={handleConfirmPasswordChange} disabled={pwLoading}>
                      {pwLoading ? "Guardando..." : "Confirmar nueva contraseña"}
                    </button>
                  </div>
                </div>
              )}

              {pwStep === "done" && pwSuccess && (
                <p className="account-save-message">{pwSuccess}</p>
              )}
            </div>
          </article>
        </>
      )}
    </section>
  );
}
