const LOCAL_API_URL = "http://localhost:4000/api";

function resolveApiUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window === "undefined") {
    return LOCAL_API_URL;
  }

  const isLocalhost = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
  return isLocalhost ? LOCAL_API_URL : `${window.location.origin}/api`;
}

const API_URL = resolveApiUrl();

function getAuthHeaders(token) {
  if (!token) {
    return { "Content-Type": "application/json" };
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

function getAuthOnlyHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchHealth() {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error("No se pudo conectar con el backend");
  }

  return response.json();
}

export async function fetchPublicShippingRules() {
  const response = await fetch(`${API_URL}/admin/shipping-rules/public`);
  if (!response.ok) return { items: [] };
  return response.json();
}

export async function fetchProducts() {
  let response;

  try {
    response = await fetch(`${API_URL}/products`);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`No se pudo conectar con la API (${API_URL}).`);
    }

    throw error;
  }

  if (!response.ok) {
    throw new Error("No se pudieron cargar los productos");
  }

  return response.json();
}

export async function login(email, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data.error || "No se pudo iniciar sesión");
      if (data.notVerified) {
        err.notVerified = true;
        err.email = data.email;
      }
      throw err;
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar con el servidor. Verificá que la API esté levantada en puerto 4000.");
    }

    throw error;
  }
}

export async function register(name, email, password, phone, address) {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone, address })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudo registrar la cuenta");
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar con el servidor. Verificá que la API esté levantada en puerto 4000.");
    }

    throw error;
  }
}

export async function verifyEmail(email, code) {
  try {
    const response = await fetch(`${API_URL}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudo verificar el código");
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar con el servidor. Verificá que la API esté levantada en puerto 4000.");
    }

    throw error;
  }
}

export async function resendVerificationCode(email) {
  try {
    const response = await fetch(`${API_URL}/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudo reenviar el código");
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar con el servidor. Verificá que la API esté levantada en puerto 4000.");
    }

    throw error;
  }
}

export async function activateWelcomeDiscount(token) {
  const response = await fetch(`${API_URL}/auth/activate-welcome-discount`, {
    method: "POST",
    headers: getAuthHeaders(token)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "No se pudo activar el descuento");
  }
  return data;
}

export async function forgotPassword(email) {
  try {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudo procesar la solicitud");
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar con el servidor. Verificá que la API esté levantada en puerto 4000.");
    }

    throw error;
  }
}

export async function resetPassword(email, code, newPassword) {
  try {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudo restablecer la contraseña");
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar con el servidor. Verificá que la API esté levantada en puerto 4000.");
    }

    throw error;
  }
}

export async function updateMyAddress(token, address) {
  const response = await fetch(`${API_URL}/auth/me/address`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ address })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo actualizar la dirección");
  }

  return data;
}

export async function updateMyProfile(token, profile) {
  const response = await fetch(`${API_URL}/auth/me/profile`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(profile || {})
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo actualizar el perfil");
  }

  return data;
}

export async function syncDeliveryZone(token, zoneData) {
  const response = await fetch(`${API_URL}/auth/me/delivery-zone`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(zoneData || {})
  });
  if (!response.ok) return null;
  return response.json();
}

export async function createProduct(token, product) {
  const response = await fetch(`${API_URL}/products`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(product)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo crear el producto");
  }

  return data;
}

export async function updateProduct(token, productId, product) {
  const response = await fetch(`${API_URL}/products/${productId}`, {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: JSON.stringify(product)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo actualizar el producto");
  }

  return data;
}

export async function uploadProductMedia(token, files, productName) {
  const formData = new FormData();

  if (productName) {
    formData.append("productName", productName);
  }

  for (const file of files || []) {
    formData.append("files", file);
  }

  const response = await fetch(`${API_URL}/products/media/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron subir las imágenes");
  }

  return data;
}

export async function deleteProduct(token, productId) {
  const response = await fetch(`${API_URL}/products/${productId}`, {
    method: "DELETE",
    headers: getAuthHeaders(token)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo eliminar el producto");
  }

  return data;
}

export async function fetchOrders(token) {
  const response = await fetch(`${API_URL}/orders`, {
    headers: getAuthHeaders(token)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar los pedidos");
  }

  return data;
}

export async function fetchMyOrders(token) {
  const response = await fetch(`${API_URL}/orders/my-orders`, {
    headers: getAuthHeaders(token)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar tus pedidos");
  }

  return data;
}

export async function updateOrderStatus(token, orderId, status, opts = {}) {
  const body = { status };
  if (opts.trackingNumber) body.trackingNumber = opts.trackingNumber;

  const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo actualizar el estado del pedido");
  }

  return data;
}

export async function verifyOrderPayment(token, orderId) {
  const response = await fetch(`${API_URL}/cart/verify-payment/${orderId}`, {
    method: "POST",
    headers: getAuthHeaders(token)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo verificar el pago");
  }

  return data;
}

export async function ensureOrderInvoice(token, orderId) {
  const response = await fetch(`${API_URL}/orders/${orderId}/invoice`, {
    method: "POST",
    headers: getAuthHeaders(token)
  });

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  let data = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const bodyText = await response.text();
    data = bodyText ? { error: bodyText } : {};
  }

  if (!response.ok) {
    throw new Error(data.error || "No se pudo generar la factura");
  }

  return data;
}

export async function fetchProductVariants(productId) {
  const response = await fetch(`${API_URL}/products/${productId}/variants`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar las variantes");
  }

  return data;
}

export async function createProductVariant(token, productId, payload) {
  const response = await fetch(`${API_URL}/products/${productId}/variants`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "No se pudo crear la variante");
  }

  return data;
}

export async function updateProductVariant(token, productId, variantId, payload) {
  const response = await fetch(`${API_URL}/products/${productId}/variants/${variantId}`, {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "No se pudo actualizar la variante");
  }

  return data;
}

export async function deleteProductVariant(token, productId, variantId) {
  const response = await fetch(`${API_URL}/products/${productId}/variants/${variantId}`, {
    method: "DELETE",
    headers: getAuthHeaders(token)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "No se pudo eliminar la variante");
  }

  return data;
}

export async function fetchLowStockAlerts(token) {
  const response = await fetch(`${API_URL}/products/alerts/low-stock`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar alertas de stock");
  }

  return data;
}

export async function fetchShippingRules(token) {
  const response = await fetch(`${API_URL}/admin/shipping-rules`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar reglas de envío");
  }

  return data;
}

export async function fetchAdminCategories(token) {
  const response = await fetch(`${API_URL}/admin/categories`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar categorías");
  }

  return data;
}

export async function createAdminCategory(token, payload) {
  const response = await fetch(`${API_URL}/admin/categories`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo crear la categoría");
  }

  return data;
}

export async function deleteAdminCategory(token, categoryId) {
  const response = await fetch(`${API_URL}/admin/categories/${categoryId}`, {
    method: "DELETE",
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo eliminar la categoría");
  }

  return data;
}

export async function updateAdminCategory(token, categoryId, payload) {
  const response = await fetch(`${API_URL}/admin/categories/${categoryId}`, {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo actualizar la categoría");
  }

  return data;
}

export async function updateShippingRule(token, ruleId, payload) {
  const response = await fetch(`${API_URL}/admin/shipping-rules/${ruleId}`, {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo actualizar la regla");
  }

  return data;
}

export async function quoteShipping(zone, subtotal) {
  const response = await fetch(`${API_URL}/admin/shipping/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zone, subtotal })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cotizar envío");
  }

  return data;
}

export async function fetchPromotions(token) {
  const response = await fetch(`${API_URL}/admin/promotions`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar promociones");
  }

  return data;
}

export async function createPromotion(token, payload) {
  const response = await fetch(`${API_URL}/admin/promotions`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo crear promoción");
  }

  return data;
}

export async function applyPromotion(code, subtotal, items, token = null) {
  const response = await fetch(`${API_URL}/admin/promotions/apply`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ code, subtotal, items })
  });
  const data = await response.json();

  if (response.ok && data?.valid === false) {
    throw new Error(data.error || "No se pudo aplicar promoción");
  }

  if (!response.ok) {
    throw new Error(data.error || "No se pudo aplicar promoción");
  }

  return data;
}

export async function fetchCustomersHistory(token) {
  const response = await fetch(`${API_URL}/admin/customers/history`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo obtener historial de clientes");
  }

  return data;
}

export async function fetchAdministrators(token) {
  const response = await fetch(`${API_URL}/admin/administrators`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo obtener administradores");
  }

  return data;
}

export async function fetchMembers(token) {
  const response = await fetch(`${API_URL}/admin/members`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo obtener miembros");
  }

  return data;
}

export async function deleteMember(token, memberId) {
  const response = await fetch(`${API_URL}/admin/members/${memberId}`, {
    method: "DELETE",
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo eliminar el usuario");
  }

  return data;
}

export async function deleteMembersBulk(token, ids) {
  const response = await fetch(`${API_URL}/admin/members`, {
    method: "DELETE",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ ids })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron eliminar los usuarios");
  }

  return data;
}

export async function fetchCustomerReorderItems(token, customerId) {
  const response = await fetch(`${API_URL}/admin/customers/${customerId}/reorder-items`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo obtener recompra rápida");
  }

  return data;
}

export async function fetchCustomerActivity(token, customerId) {
  const response = await fetch(`${API_URL}/admin/customers/${customerId}/activity`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo obtener actividad del cliente");
  }

  return data;
}

export async function fetchSalesByProduct(token) {
  const response = await fetch(`${API_URL}/admin/reports/sales-by-product`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar reporte por producto");
  }

  return data;
}

export async function fetchSalesByBrand(token) {
  const response = await fetch(`${API_URL}/admin/reports/sales-by-brand`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar reporte por marca");
  }

  return data;
}

export async function fetchAdminAnalytics(token, periodOrRange = "30d") {
  const params = new URLSearchParams();

  if (periodOrRange && typeof periodOrRange === "object" && periodOrRange.from && periodOrRange.to) {
    params.set("from", new Date(periodOrRange.from).toISOString());
    params.set("to", new Date(periodOrRange.to).toISOString());
  } else if (typeof periodOrRange === "number" && Number.isFinite(periodOrRange)) {
    const safeDays = Math.max(1, Math.min(180, Number(periodOrRange)));
    params.set("days", String(safeDays));
  } else {
    const normalizedPeriod = String(periodOrRange || "30d").trim().toLowerCase();
    params.set("period", normalizedPeriod || "30d");
  }

  const response = await fetch(`${API_URL}/admin/analytics?${params.toString()}`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar analíticas");
  }

  return data;
}

export async function fetchAdminUserSessions(token, periodOrRange = "30d") {
  const params = new URLSearchParams();

  if (periodOrRange && typeof periodOrRange === "object" && periodOrRange.from && periodOrRange.to) {
    params.set("from", new Date(periodOrRange.from).toISOString());
    params.set("to", new Date(periodOrRange.to).toISOString());
  } else if (typeof periodOrRange === "number" && Number.isFinite(periodOrRange)) {
    const safeDays = Math.max(1, Math.min(180, Number(periodOrRange)));
    params.set("days", String(safeDays));
  } else {
    const normalizedPeriod = String(periodOrRange || "30d").trim().toLowerCase();
    params.set("period", normalizedPeriod || "30d");
  }

  const response = await fetch(`${API_URL}/admin/analytics/user-sessions?${params.toString()}`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar las sesiones de usuario");
  }

  return data;
}

export async function trackAnalyticsEvent(payload = {}) {
  const endpoint = `${API_URL}/analytics/events`;
  const body = JSON.stringify(payload || {});

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    const sent = navigator.sendBeacon(endpoint, blob);

    if (sent) {
      return { ok: true };
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export async function checkoutCart(payload, token = null) {
  const response = await fetch(`${API_URL}/cart/checkout`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo confirmar la compra");
  }

  return data;
}

export async function fetchUserCart(token) {
  const response = await fetch(`${API_URL}/cart`, {
    headers: getAuthHeaders(token)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar el carrito");
  }

  return data;
}

export async function sendSmartOrder(message) {
  const response = await fetch(`${API_URL}/ai/smart-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "No se pudo procesar el pedido inteligente");
  }
  return data;
}

export async function saveUserCart(token, items = []) {
  const response = await fetch(`${API_URL}/cart`, {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ items: Array.isArray(items) ? items : [] })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo guardar el carrito");
  }

  return data;
}

export async function clearUserCart(token) {
  const response = await fetch(`${API_URL}/cart`, {
    method: "DELETE",
    headers: getAuthHeaders(token)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo limpiar el carrito");
  }

  return data;
}

export async function fetchTickets(token, filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  const response = await fetch(`${API_URL}/tickets${query ? `?${query}` : ""}`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar tickets");
  }

  return data;
}

export async function fetchTicketMetrics(token) {
  const response = await fetch(`${API_URL}/tickets/metrics`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar métricas de tickets");
  }

  return data;
}

export async function createTicket(token, payload, files = []) {
  const formData = new FormData();

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, String(value));
    }
  });

  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`${API_URL}/tickets`, {
    method: "POST",
    headers: getAuthOnlyHeaders(token),
    body: formData
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo crear el ticket");
  }

  return data;
}

export async function submitLegalTicket(payload, files = []) {
  const formData = new FormData();

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, String(value));
    }
  });

  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`${API_URL}/tickets/public/legal-request`, {
    method: "POST",
    body: formData
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo registrar la solicitud");
  }

  return data;
}

export async function updateTicket(token, ticketRef, payload) {
  const response = await fetch(`${API_URL}/tickets/${ticketRef}`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo actualizar el ticket");
  }

  return data;
}

export async function addTicketComment(token, ticketRef, payload, files = []) {
  const formData = new FormData();

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, String(value));
    }
  });

  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`${API_URL}/tickets/${ticketRef}/comments`, {
    method: "POST",
    headers: getAuthOnlyHeaders(token),
    body: formData
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo agregar el comentario");
  }

  return data;
}

export async function closeTicket(token, ticketRef) {
  const response = await fetch(`${API_URL}/tickets/${ticketRef}/close`, {
    method: "POST",
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo cerrar el ticket");
  }

  return data;
}

export async function deleteTicket(token, ticketRef) {
  const response = await fetch(`${API_URL}/tickets/${ticketRef}`, {
    method: "DELETE",
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo borrar el ticket");
  }

  return data;
}

// ── Notifications ────────────────────────────────────────

export async function fetchNotifications(token, { unread = false, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (unread) params.set("unread", "true");
  if (limit) params.set("limit", String(limit));

  const response = await fetch(`${API_URL}/notifications?${params}`, {
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar las notificaciones");
  }

  return data;
}

export async function markNotificationRead(token, notifId) {
  const response = await fetch(`${API_URL}/notifications/${notifId}/read`, {
    method: "PATCH",
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo marcar como leída");
  }

  return data;
}

export async function markAllNotificationsRead(token) {
  const response = await fetch(`${API_URL}/notifications/read-all`, {
    method: "POST",
    headers: getAuthHeaders(token)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron marcar como leídas");
  }

  return data;
}
