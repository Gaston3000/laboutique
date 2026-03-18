import { Router } from "express";
import jwt from "jsonwebtoken";
import { db, query } from "../db.js";
import { handleOrderStatusChange } from "../services/notificationService.js";

const cartRouter = Router();
const MERCADOPAGO_API_URL = "https://api.mercadopago.com";
const WELCOME_PROMO_CODE = "PRIMERACOMPRA10";
let userCartStorageReady = false;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toMoneyAmount(value) {
  const normalized = toNumber(value) ?? 0;
  return Number(normalized.toFixed(2));
}

function toNullableInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = toInteger(value);
  return parsed && parsed > 0 ? parsed : null;
}

function getBearerToken(req) {
  const authHeader = String(req.headers.authorization || "");
  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
}

async function resolveOptionalAuthUser(req) {
  const token = getBearerToken(req);

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const userId = Number(payload?.id);
    const userEmail = normalizeText(payload?.email).toLowerCase();

    let userResult = null;

    if (Number.isInteger(userId) && userId > 0) {
      userResult = await query(
        "SELECT id, name, email, role FROM users WHERE id = $1 LIMIT 1",
        [userId]
      );
    }

    if ((!userResult || !userResult.rows[0]) && userEmail) {
      userResult = await query(
        "SELECT id, name, email, role FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
        [userEmail]
      );
    }

    const user = userResult?.rows?.[0];

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
  } catch {
    return null;
  }
}

async function resolveRequiredAuthUser(req, res) {
  const authUser = await resolveOptionalAuthUser(req);

  if (!authUser) {
    res.status(401).json({ error: "No autorizado" });
    return null;
  }

  return authUser;
}

function sanitizeCartItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const normalized = [];

  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== "object") {
      continue;
    }

    const productId = toInteger(rawItem.id ?? rawItem.productId);
    const quantity = toInteger(rawItem.quantity);
    const variantId = toNullableInteger(rawItem.variantId);

    if (!productId || productId <= 0 || !quantity || quantity <= 0) {
      continue;
    }

    const cartKey = normalizeText(rawItem.cartKey) || `${productId}:${variantId ?? "base"}`;

    normalized.push({
      ...rawItem,
      id: productId,
      productId,
      variantId,
      quantity,
      cartKey
    });

    if (normalized.length >= 200) {
      break;
    }
  }

  return normalized;
}

async function ensureUserCartStorage() {
  if (userCartStorageReady) {
    return;
  }

  await query(
    `CREATE TABLE IF NOT EXISTS user_carts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`
  );

  await query("CREATE INDEX IF NOT EXISTS idx_user_carts_user_id ON user_carts(user_id)");
  userCartStorageReady = true;
}

async function ensureWelcomePromoEligibility(queryRunner, authUser) {
  if (!authUser?.email) {
    throw new Error("Esta promoción es exclusiva para usuarios registrados");
  }

  const ordersResult = await queryRunner(
    `SELECT EXISTS (
      SELECT 1
      FROM orders
      WHERE LOWER(contact_email) = LOWER($1)
        AND status <> 'cancelado'
    ) AS has_orders`,
    [authUser.email]
  );

  if (ordersResult.rows[0]?.has_orders) {
    throw new Error("El cupón de bienvenida solo aplica a la primera compra");
  }
}

function getPublicBaseUrl(req) {
  const configured = String(process.env.PUBLIC_BASE_URL || "").trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.get("host");
  return `${protocol}://${host}`;
}

function normalizeUrl(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return "";
  }

  try {
    const parsed = new URL(rawValue);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return "";
    }

    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function resolveClientBaseUrl(req) {
  const configuredClientUrl = normalizeUrl(process.env.CLIENT_URL);
  if (configuredClientUrl) {
    return configuredClientUrl;
  }

  const requestOrigin = normalizeUrl(req.headers.origin);
  if (requestOrigin) {
    return requestOrigin;
  }

  return "";
}

async function resolvePromotionDiscount(promoCode, subtotal, items, options = {}) {
  const queryRunner = typeof options.queryRunner === "function" ? options.queryRunner : query;
  const authUser = options.authUser || null;
  const normalizedCode = normalizeText(promoCode).toUpperCase();

  if (!normalizedCode) {
    return { code: null, name: null, discount: 0 };
  }

  const promoResult = await queryRunner(
    `SELECT id, code, name, type, value, min_qty, min_subtotal_ars, product_id, target_product_id
     FROM promotions
     WHERE code = $1
       AND active = TRUE
       AND (starts_at IS NULL OR starts_at <= NOW())
       AND (ends_at IS NULL OR ends_at >= NOW())
     LIMIT 1`,
    [normalizedCode]
  );

  const promo = promoResult.rows[0];

  if (!promo) {
    throw new Error("Cupón no válido o inactivo");
  }

  if (promo.code === WELCOME_PROMO_CODE) {
    await ensureWelcomePromoEligibility(queryRunner, authUser);
  }

  const totalQty = items.reduce((sum, item) => sum + Math.max(0, toInteger(item.quantity, 0)), 0);

  if (promo.min_subtotal_ars !== null && subtotal < Number(promo.min_subtotal_ars)) {
    throw new Error("No alcanzás el subtotal mínimo para este cupón");
  }

  if (promo.min_qty !== null && totalQty < promo.min_qty) {
    throw new Error("No alcanzás la cantidad mínima para este cupón");
  }

  let discount = 0;
  const value = Number(promo.value || 0);

  if (promo.type === "percent") {
    discount = subtotal * (value / 100);
  }

  if (promo.type === "fixed") {
    discount = value;
  }

  if (promo.type === "volume") {
    discount = subtotal * (value / 100);
  }

  if (promo.type === "two_for_one" && promo.product_id) {
    const targetItem = items.find((item) => toInteger(item.productId, 0) === promo.product_id);
    if (targetItem) {
      const qty = Math.max(0, toInteger(targetItem.quantity, 0));
      const freeUnits = Math.floor(qty / 2);
      const unitPrice = Math.max(0, toNumber(targetItem.unitPrice, 0));
      discount = freeUnits * unitPrice;
    }
  }

  if (promo.type === "combo" && promo.product_id && promo.target_product_id) {
    const hasFirst = items.some((item) => toInteger(item.productId, 0) === promo.product_id && toInteger(item.quantity, 0) > 0);
    const hasSecond = items.some((item) => toInteger(item.productId, 0) === promo.target_product_id && toInteger(item.quantity, 0) > 0);
    discount = hasFirst && hasSecond ? value : 0;
  }

  const normalizedDiscount = Math.max(0, Math.min(subtotal, discount));

  return {
    code: promo.code,
    name: promo.name,
    discount: toMoneyAmount(normalizedDiscount)
  };
}

function buildMercadoPagoItems({ orderId, orderLines, shippingCost, discount }) {
  let discountRemaining = toMoneyAmount(discount);

  const items = orderLines
    .map((line) => {
      const lineTotal = toMoneyAmount(line.unitPrice * line.quantity);
      const lineDiscount = Math.min(discountRemaining, lineTotal);
      discountRemaining = toMoneyAmount(discountRemaining - lineDiscount);
      const netLineTotal = toMoneyAmount(lineTotal - lineDiscount);

      if (netLineTotal <= 0) {
        return null;
      }

      return {
        id: String(line.variantId ? `${line.productId}-${line.variantId}` : line.productId),
        title: `${line.productName} x${line.quantity}`,
        quantity: 1,
        currency_id: "ARS",
        unit_price: netLineTotal
      };
    })
    .filter(Boolean);

  if (toMoneyAmount(shippingCost) > 0) {
    items.push({
      id: `shipping-${orderId}`,
      title: "Envío",
      quantity: 1,
      currency_id: "ARS",
      unit_price: toMoneyAmount(shippingCost)
    });
  }

  if (!items.length) {
    throw new Error("No hay ítems válidos para generar el pago");
  }

  return items;
}

async function createMercadoPagoPreference(req, { orderId, customerName, orderLines, shippingCost, discount, total }) {
  const accessToken = String(process.env.MERCADOPAGO_ACCESS_TOKEN || "").trim();

  if (!accessToken) {
    throw new Error("Falta configurar MERCADOPAGO_ACCESS_TOKEN en el backend (reiniciá el servidor luego de editar .env)");
  }

  const clientUrl = resolveClientBaseUrl(req);
  const publicBaseUrl = getPublicBaseUrl(req);
  const notificationUrl = `${publicBaseUrl}/api/cart/mercadopago/webhook`;

  const items = buildMercadoPagoItems({ orderId, orderLines, shippingCost, discount });

  const backUrls = clientUrl
    ? {
      success: `${clientUrl}/?checkout=success&order=${orderId}`,
      failure: `${clientUrl}/?checkout=failure&order=${orderId}`,
      pending: `${clientUrl}/?checkout=pending&order=${orderId}`
    }
    : null;

  const isLocalClientUrl = (() => {
    if (!clientUrl) {
      return true;
    }

    try {
      const hostname = new URL(clientUrl).hostname.toLowerCase();
      return hostname === "localhost" || hostname === "127.0.0.1";
    } catch {
      return true;
    }
  })();

  const payload = {
    external_reference: String(orderId),
    statement_descriptor: "BOUTTIQUE LIMPIEZA",
    notification_url: notificationUrl,
    ...(backUrls ? { back_urls: backUrls } : {}),
    ...((backUrls && !isLocalClientUrl) ? { auto_return: "approved" } : {}),
    payer: {
      name: customerName
    },
    metadata: {
      order_id: orderId,
      source: "web-store"
    },
    items
  };

  const response = await fetch(`${MERCADOPAGO_API_URL}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  const preference = await response.json();

  if (!response.ok) {
    const mpDetails = Array.isArray(preference?.cause)
      ? preference.cause.map((item) => item?.description || item?.code).filter(Boolean).join(". ")
      : "";
    const message = preference?.message || preference?.error || "No se pudo generar la preferencia de pago";
    const fullMessage = mpDetails ? `${message}. ${mpDetails}` : message;
    throw new Error(fullMessage);
  }

  if (!preference?.init_point) {
    throw new Error("Mercado Pago no devolvió una URL de pago válida");
  }

  await query(
    `UPDATE orders
     SET payment_status = $1,
         payment_method = $2,
         source = $3,
         purchase_extra_data = $4,
         raw_payload = COALESCE(raw_payload, '{}'::jsonb) || $5::jsonb
     WHERE id = $6`,
    [
      "pending",
      "mercadopago",
      "web-mp",
      `preference_id:${preference.id}`,
      JSON.stringify({
        mercadopago: {
          preference_id: preference.id,
          init_point: preference.init_point,
          sandbox_init_point: preference.sandbox_init_point || null,
          created_at: new Date().toISOString(),
          discount,
          total
        }
      }),
      orderId
    ]
  );

  return {
    preferenceId: preference.id,
    checkoutUrl: preference.init_point,
    sandboxCheckoutUrl: preference.sandbox_init_point || null
  };
}

async function fetchMercadoPagoPayment(paymentId) {
  const accessToken = String(process.env.MERCADOPAGO_ACCESS_TOKEN || "").trim();

  if (!accessToken) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN");
  }

  const response = await fetch(`${MERCADOPAGO_API_URL}/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payment = await response.json();

  if (!response.ok) {
    const message = payment?.message || payment?.error || "No se pudo consultar el pago";
    throw new Error(message);
  }

  return payment;
}

async function getShippingCost(shippingZone, _subtotal) {
  if (!shippingZone) {
    return { zone: null, shippingCost: 0 };
  }

  const normalizedZone = normalizeText(shippingZone).toLowerCase();

  if (normalizedZone === "caba") {
    return { zone: "caba", shippingCost: 5000 };
  }

  if (normalizedZone === "gba") {
    return { zone: "gba", shippingCost: 7000 };
  }

  if (normalizedZone === "pickup") {
    return { zone: null, shippingCost: 0 };
  }

  return null;
}

cartRouter.get("/", async (req, res) => {
  try {
    const authUser = await resolveOptionalAuthUser(req);

    if (!authUser) {
      return res.json({ items: [] });
    }

    await ensureUserCartStorage();

    const cartResult = await query(
      "SELECT items FROM user_carts WHERE user_id = $1 LIMIT 1",
      [authUser.id]
    );

    const storedItems = cartResult.rows[0]?.items;
    const items = sanitizeCartItems(Array.isArray(storedItems) ? storedItems : []);

    return res.json({ items });
  } catch (error) {
    console.error("GET /api/cart failed:", error?.message || error);
    return res.status(500).json({ error: "No se pudo cargar el carrito" });
  }
});

cartRouter.put("/", async (req, res) => {
  const authUser = await resolveRequiredAuthUser(req, res);

  if (!authUser) {
    return;
  }

  const receivedItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const items = sanitizeCartItems(receivedItems);

  if (receivedItems.length > 0 && items.length === 0) {
    return res.status(400).json({ error: "Hay productos inválidos en el carrito" });
  }

  try {
    await ensureUserCartStorage();

    const saveResult = await query(
      `INSERT INTO user_carts (user_id, items, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET items = EXCLUDED.items, updated_at = NOW()
       RETURNING items, updated_at`,
      [authUser.id, JSON.stringify(items)]
    );

    return res.json({
      items: sanitizeCartItems(Array.isArray(saveResult.rows[0]?.items) ? saveResult.rows[0].items : []),
      updatedAt: saveResult.rows[0]?.updated_at || null
    });
  } catch (error) {
    console.error("PUT /api/cart failed:", error?.message || error);
    return res.status(500).json({ error: "No se pudo guardar el carrito" });
  }
});

cartRouter.delete("/", async (req, res) => {
  const authUser = await resolveRequiredAuthUser(req, res);

  if (!authUser) {
    return;
  }

  try {
    await ensureUserCartStorage();
    await query("DELETE FROM user_carts WHERE user_id = $1", [authUser.id]);
    return res.json({ items: [] });
  } catch (error) {
    console.error("DELETE /api/cart failed:", error?.message || error);
    return res.status(500).json({ error: "No se pudo limpiar el carrito" });
  }
});

cartRouter.post("/checkout", async (req, res) => {
  const customerName = normalizeText(req.body?.customerName);
  const customerPhone = normalizeText(req.body?.customerPhone) || null;
  const customerAddress = normalizeText(req.body?.customerAddress) || null;
  const shippingCity = normalizeText(req.body?.shippingCity) || null;
  const shippingState = normalizeText(req.body?.shippingState) || null;
  const shippingPostalCode = normalizeText(req.body?.shippingPostalCode) || null;
  const customerNote = normalizeText(req.body?.customerNote) || null;
  const shippingZone = normalizeText(req.body?.shippingZone).toLowerCase() || null;
  const promoCode = normalizeText(req.body?.promoCode).toUpperCase() || null;
  const authUser = await resolveOptionalAuthUser(req);
  const contactEmail = normalizeText(authUser?.email || req.body?.contactEmail).toLowerCase() || null;
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!customerName) {
    return res.status(400).json({ error: "El nombre del cliente es obligatorio" });
  }

  if (!contactEmail) {
    return res.status(400).json({ error: "El email de contacto es obligatorio" });
  }

  if (!customerAddress) {
    return res.status(400).json({ error: "La dirección es obligatoria para confirmar la compra" });
  }

  if (!items.length) {
    return res.status(400).json({ error: "El carrito está vacío" });
  }

  const normalizedItems = [];

  for (const item of items) {
    const productId = toInteger(item?.productId ?? item?.id);
    const rawVariantId = item?.variantId;
    const variantId = rawVariantId === null || rawVariantId === undefined || rawVariantId === ""
      ? null
      : toInteger(rawVariantId);
    const quantity = toInteger(item?.quantity);

    if (!productId || productId <= 0 || !quantity || quantity <= 0 || (variantId !== null && variantId <= 0)) {
      return res.status(400).json({ error: "Hay productos inválidos en el carrito" });
    }

    normalizedItems.push({ productId, variantId, quantity });
  }

  const mergedItemsByKey = normalizedItems.reduce((acc, item) => {
    const lineKey = `${item.productId}:${item.variantId ?? "base"}`;

    if (!acc[lineKey]) {
      acc[lineKey] = { productId: item.productId, variantId: item.variantId, quantity: 0 };
    }

    acc[lineKey].quantity += item.quantity;
    return acc;
  }, {});

  const mergedItems = Object.values(mergedItemsByKey);
  const productIds = Array.from(new Set(mergedItems.map((item) => item.productId)));
  const variantIds = Array.from(
    new Set(
      mergedItems
        .map((item) => item.variantId)
        .filter((variantId) => Number.isInteger(variantId) && variantId > 0)
    )
  );
  const client = await db.connect();

  let transactionOpen = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;

    const productsResult = await client.query(
      `SELECT id, name, brand, price_ars, stock
       FROM products
       WHERE id = ANY($1::int[])
       FOR UPDATE`,
      [productIds]
    );

    if (productsResult.rows.length !== productIds.length) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(404).json({ error: "Uno o más productos ya no están disponibles" });
    }

    const productsById = productsResult.rows.reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {});

    const variantsById = {};

    if (variantIds.length) {
      const variantsResult = await client.query(
        `SELECT id, product_id, name, presentation, price_delta_ars, stock, is_active
         FROM product_variants
         WHERE id = ANY($1::int[])
         FOR UPDATE`,
        [variantIds]
      );

      if (variantsResult.rows.length !== variantIds.length) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        return res.status(404).json({ error: "Una o más opciones ya no están disponibles" });
      }

      for (const variant of variantsResult.rows) {
        variantsById[variant.id] = variant;
      }
    }

    const orderLines = [];
    let subtotal = 0;

    for (const item of mergedItems) {
      const product = productsById[item.productId];
      const requestedQty = item.quantity;
      const variant = item.variantId ? variantsById[item.variantId] : null;

      if (variant && (variant.product_id !== item.productId || variant.is_active !== true)) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        return res.status(409).json({ error: `La opción seleccionada para ${product.name} no está disponible` });
      }

      const currentStock = variant ? (toInteger(variant.stock) ?? 0) : (toInteger(product.stock) ?? 0);

      if (requestedQty > currentStock) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        return res.status(409).json({
          error: variant
            ? `Stock insuficiente para ${product.name} (${variant.presentation ? `${variant.presentation}: ` : ""}${variant.name})`
            : `Stock insuficiente para ${product.name}`
        });
      }

      const unitPrice = (toNumber(product.price_ars) ?? 0) + (variant ? (toNumber(variant.price_delta_ars) ?? 0) : 0);
      subtotal += unitPrice * requestedQty;

      const variantLabel = variant
        ? ` (${variant.presentation ? `${variant.presentation}: ` : ""}${variant.name})`
        : "";

      orderLines.push({
        productId: item.productId,
        variantId: variant?.id || null,
        productName: `${product.name}${variantLabel}`,
        brand: product.brand,
        quantity: requestedQty,
        unitPrice
      });
    }

    let promotionResult = { code: null, name: null, discount: 0 };

    if (promoCode) {
      try {
        promotionResult = await resolvePromotionDiscount(
          promoCode,
          subtotal,
          orderLines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice
          })),
          {
            queryRunner: (text, params = []) => client.query(text, params),
            authUser
          }
        );
      } catch (promoError) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        return res.status(400).json({ error: promoError.message || "No se pudo aplicar el cupón" });
      }
    }

    const discountAmount = toMoneyAmount(promotionResult.discount || 0);

    const shippingData = await getShippingCost(shippingZone, subtotal);

    if (shippingZone && !shippingData) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(400).json({ error: "Zona de envío inválida" });
    }

    const shippingCost = shippingData?.shippingCost ?? 0;
    const total = toMoneyAmount(subtotal + shippingCost - discountAmount);

    const orderResult = await client.query(
      `INSERT INTO orders (
        customer_name,
        customer_phone,
        customer_address,
        contact_email,
        customer_note,
        shipping_zone,
        shipping_city,
        shipping_state,
        shipping_postal_code,
        shipping_cost_ars,
        discount_ars,
        promo_code,
        total_ars,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'nuevo')
      RETURNING id, customer_name, customer_phone, customer_address, shipping_zone, shipping_cost_ars, total_ars, status, created_at`,
      [
        customerName,
        customerPhone,
        customerAddress,
        contactEmail,
        customerNote,
        shippingData?.zone ?? null,
        shippingCity,
        shippingState,
        shippingPostalCode,
        shippingCost,
        discountAmount,
        promotionResult.code,
        total
      ]
    );

    const order = orderResult.rows[0];

    for (const line of orderLines) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, brand, product_name, quantity, unit_price_ars)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, line.productId, line.variantId, line.brand, line.productName, line.quantity, line.unitPrice]
      );

      if (line.variantId) {
        await client.query(
          `UPDATE product_variants
           SET stock = stock - $1
           WHERE id = $2`,
          [line.quantity, line.variantId]
        );
      } else {
        await client.query(
          `UPDATE products
           SET stock = stock - $1
           WHERE id = $2`,
          [line.quantity, line.productId]
        );
      }
    }

    // Mark welcome discount as used if it was active
    if (authUser?.id) {
      await client.query(
        `UPDATE users
         SET welcome_discount_used = TRUE,
             welcome_discount_active = FALSE
         WHERE id = $1 
           AND welcome_discount_active = TRUE
           AND (welcome_discount_expires_at IS NULL OR welcome_discount_expires_at > NOW())`,
        [authUser.id]
      );
    }

    await client.query("COMMIT");
    transactionOpen = false;

    let mercadoPago = null;

    try {
      mercadoPago = await createMercadoPagoPreference(req, {
        orderId: order.id,
        customerName,
        orderLines,
        shippingCost,
        discount: discountAmount,
        total
      });
    } catch (paymentError) {
      await query(
        `UPDATE orders
         SET purchase_extra_data = $1,
             raw_payload = COALESCE(raw_payload, '{}'::jsonb) || $2::jsonb
         WHERE id = $3`,
        [
          "mercadopago_preference_error",
          JSON.stringify({
            mercadopago_error: {
              message: paymentError.message,
              created_at: new Date().toISOString()
            }
          }),
          order.id
        ]
      );

      throw paymentError;
    }

    // Fire ORDER_CREATED notification (non-blocking)
    handleOrderStatusChange(order.id, "nuevo", { skipDbUpdate: true }).catch((err) => {
      console.error(`⚠️ Error en notificación ORDER_CREATED para pedido #${order.id}:`, err.message);
    });

    return res.status(201).json({
      item: {
        id: order.id,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerAddress: order.customer_address,
        shippingZone: order.shipping_zone,
        shippingCost: Number(order.shipping_cost_ars),
        subtotal: Number(subtotal.toFixed(2)),
        discount: discountAmount,
        total: Number(order.total_ars),
        status: order.status,
        createdAt: order.created_at,
        lines: orderLines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          productName: line.productName,
          quantity: line.quantity,
          unitPrice: Number(line.unitPrice)
        }))
      },
      payment: mercadoPago
    });

  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK");
    }
    return res.status(500).json({ error: error.message || "No se pudo confirmar la compra" });
  } finally {
    client.release();
  }
});

cartRouter.post("/mercadopago/webhook", async (req, res) => {
  const type = String(req.body?.type || req.query?.type || "").trim().toLowerCase();
  const action = String(req.body?.action || "").trim().toLowerCase();
  const dataId = Number(req.body?.data?.id || req.query?.["data.id"] || req.query?.id);

  if (type !== "payment" && !action.includes("payment")) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  if (!Number.isInteger(dataId) || dataId <= 0) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  try {
    const payment = await fetchMercadoPagoPayment(dataId);
    const externalReference = Number(payment.external_reference);

    if (!Number.isInteger(externalReference) || externalReference <= 0) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const mpStatus = String(payment.status || "").trim().toLowerCase();
    const mappedOrderStatus = mpStatus === "approved" ? "pago" : "nuevo";

    await query(
      `UPDATE orders
       SET status = CASE
          WHEN $1 = 'approved' THEN 'pago'
          WHEN $1 IN ('cancelled', 'rejected', 'refunded', 'charged_back') THEN 'cancelado'
          ELSE status
        END,
        payment_status = $1,
        payment_method = COALESCE(NULLIF($2, ''), payment_method, 'mercadopago'),
        source = COALESCE(source, 'web-mp'),
        raw_payload = COALESCE(raw_payload, '{}'::jsonb) || $3::jsonb
       WHERE id = $4`,
      [
        mpStatus,
        String(payment.payment_method_id || "").trim(),
        JSON.stringify({
          mercadopago_payment: {
            id: payment.id,
            status: mpStatus,
            status_detail: payment.status_detail || null,
            approved_at: payment.date_approved || null,
            updated_at: new Date().toISOString(),
            transaction_amount: payment.transaction_amount || null,
            external_reference: payment.external_reference || null
          }
        }),
        externalReference
      ]
    );

    // Fire notification for payment status change (non-blocking)
    if (mpStatus === "approved") {
      handleOrderStatusChange(externalReference, "pago", { skipDbUpdate: true }).catch((err) => {
        console.error(`⚠️ Error en notificación PAYMENT_APPROVED para pedido #${externalReference}:`, err.message);
      });
    } else if (["cancelled", "rejected", "refunded", "charged_back"].includes(mpStatus)) {
      handleOrderStatusChange(externalReference, "cancelado", { skipDbUpdate: true }).catch((err) => {
        console.error(`⚠️ Error en notificación PAYMENT_FAILED para pedido #${externalReference}:`, err.message);
      });
    }

    return res.status(200).json({ ok: true, orderStatus: mappedOrderStatus });
  } catch {
    return res.status(200).json({ ok: true, ignored: true });
  }
});

export default cartRouter;
