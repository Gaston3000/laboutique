import { Router } from "express";
import jwt from "jsonwebtoken";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { db, query } from "../db.js";

const adminRouter = Router();
const WELCOME_PROMO_CODE = "PRIMERACOMPRA10";
const ALLOWED_SHIPPING_ZONES = ["caba", "gba", "retiro_local"];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
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

async function ensureWelcomePromoEligibility(authUser) {
  if (!authUser?.email) {
    throw new Error("Esta promoción es exclusiva para usuarios registrados");
  }

  const ordersResult = await query(
    `SELECT EXISTS (
      SELECT 1
      FROM orders
      WHERE LOWER(contact_email) = LOWER($1)
        AND status <> 'cancelado'
    ) AS has_orders`,
    [authUser.email]
  );

  if (ordersResult.rows[0]?.has_orders) {
    throw new Error("Ya usaste este cupón");
  }
}

function clampAnalyticsDays(value, fallback = 30) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(180, Math.max(1, parsed));
}

function startOfDay(dateValue) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(dateValue, amount) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + Number(amount || 0));
  return date;
}

function resolveAnalyticsRange(periodInput, daysInput, fromInput, toInput) {
  const now = new Date();

  if (fromInput && toInput) {
    const parsedFrom = new Date(fromInput);
    const parsedTo = new Date(toInput);

    if (!Number.isNaN(parsedFrom.getTime()) && !Number.isNaN(parsedTo.getTime())) {
      const from = parsedFrom < parsedTo ? parsedFrom : parsedTo;
      const to = parsedFrom < parsedTo ? parsedTo : parsedFrom;
      const maxAllowed = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const safeTo = to > maxAllowed ? maxAllowed : to;
      const diffMs = safeTo.getTime() - from.getTime();
      const days = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
      const previousFrom = new Date(from.getTime() - diffMs);

      return {
        period: "custom",
        days,
        from,
        to: safeTo,
        previousFrom,
        previousTo: from
      };
    }
  }

  const period = String(periodInput || "").trim().toLowerCase();

  if (period === "today" || period === "hoy") {
    const from = startOfDay(now);
    const previousFrom = startOfDay(addDays(now, -1));

    return {
      period: "today",
      days: 1,
      from,
      to: now,
      previousFrom,
      previousTo: from
    };
  }

  if (period === "yesterday" || period === "ayer") {
    const to = startOfDay(now);
    const from = startOfDay(addDays(now, -1));
    const previousFrom = startOfDay(addDays(now, -2));

    return {
      period: "yesterday",
      days: 1,
      from,
      to,
      previousFrom,
      previousTo: from
    };
  }

  const periodToDaysMap = {
    "7d": 7,
    "14d": 14,
    "30d": 30,
    "60d": 60,
    "90d": 90
  };

  const derivedDays = periodToDaysMap[period] || clampAnalyticsDays(period || daysInput, clampAnalyticsDays(daysInput, 30));
  const from = new Date(now.getTime() - derivedDays * 24 * 60 * 60 * 1000);
  const previousFrom = new Date(from.getTime() - derivedDays * 24 * 60 * 60 * 1000);

  return {
    period: period && periodToDaysMap[period] ? period : `${derivedDays}d`,
    days: derivedDays,
    from,
    to: now,
    previousFrom,
    previousTo: from
  };
}

function percentDelta(current, previous) {
  const safeCurrent = Number(current || 0);
  const safePrevious = Number(previous || 0);

  if (safePrevious === 0) {
    return safeCurrent > 0 ? 100 : 0;
  }

  return ((safeCurrent - safePrevious) / safePrevious) * 100;
}

function classifyTrafficChannel(sourceValue, mediumValue) {
  const source = String(sourceValue || "").trim().toLowerCase();
  const medium = String(mediumValue || "").trim().toLowerCase();

  if (!source || source === "directo" || source === "direct") {
    return "Directo";
  }

  if (medium.includes("email") || source.includes("mail")) {
    return "Email";
  }

  if (medium.includes("paid") || medium.includes("cpc") || medium.includes("ads")) {
    return "Pago";
  }

  if (
    source.includes("facebook")
    || source.includes("instagram")
    || source.includes("tiktok")
    || source.includes("linkedin")
    || source.includes("x.com")
    || source.includes("twitter")
    || source.includes("youtube")
  ) {
    return "Social";
  }

  if (
    source.includes("google")
    || source.includes("bing")
    || source.includes("yahoo")
    || medium.includes("organic")
  ) {
    return "Orgánico";
  }

  return "Referido";
}

adminRouter.get("/categories", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await query(
      `SELECT c.id,
              c.name,
              COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.categories @> ARRAY[c.name]::text[]
       GROUP BY c.id, c.name
       ORDER BY c.name ASC`
    );

    return res.json({
      items: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        productCount: Number(row.product_count)
      }))
    });
  } catch {
    return res.status(500).json({ error: "No se pudieron obtener categorías" });
  }
});

adminRouter.post("/categories", requireAuth, requireAdmin, async (req, res) => {
  const name = normalizeText(req.body?.name);

  if (!name) {
    return res.status(400).json({ error: "Nombre de categoría inválido" });
  }

  try {
    const existingResult = await query("SELECT id, name FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1", [name]);
    if (existingResult.rows[0]) {
      return res.status(409).json({ error: "La categoría ya existe" });
    }

    const insertResult = await query(
      `INSERT INTO categories (name)
       VALUES ($1)
       RETURNING id, name`,
      [name]
    );

    return res.status(201).json({
      item: {
        id: insertResult.rows[0].id,
        name: insertResult.rows[0].name,
        productCount: 0
      }
    });
  } catch {
    return res.status(500).json({ error: "No se pudo crear la categoría" });
  }
});

adminRouter.put("/categories/:id", requireAuth, requireAdmin, async (req, res) => {
  const categoryId = Number(req.params.id);
  const nextName = normalizeText(req.body?.name);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return res.status(400).json({ error: "ID de categoría inválido" });
  }

  if (!nextName) {
    return res.status(400).json({ error: "Nombre de categoría inválido" });
  }

  const dbClient = await db.connect();

  try {
    await dbClient.query("BEGIN");

    const currentResult = await dbClient.query("SELECT id, name FROM categories WHERE id = $1 LIMIT 1", [categoryId]);
    const currentCategory = currentResult.rows[0];

    if (!currentCategory) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    const currentName = currentCategory.name;

    const duplicateResult = await dbClient.query(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id <> $2 LIMIT 1",
      [nextName, categoryId]
    );

    if (duplicateResult.rows[0]) {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
    }

    const updateCategoryResult = await dbClient.query(
      `UPDATE categories
       SET name = $1
       WHERE id = $2
       RETURNING id, name`,
      [nextName, categoryId]
    );

    await dbClient.query(
      `UPDATE products
       SET categories = array_replace(categories, $1, $2)
       WHERE categories @> ARRAY[$1]::text[]`,
      [currentName, nextName]
    );

    await dbClient.query("COMMIT");

    return res.json({
      item: {
        id: updateCategoryResult.rows[0].id,
        name: updateCategoryResult.rows[0].name
      }
    });
  } catch {
    await dbClient.query("ROLLBACK");
    return res.status(500).json({ error: "No se pudo actualizar la categoría" });
  } finally {
    dbClient.release();
  }
});

adminRouter.delete("/categories/:id", requireAuth, requireAdmin, async (req, res) => {
  const categoryId = Number(req.params.id);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return res.status(400).json({ error: "ID de categoría inválido" });
  }

  try {
    const deleteResult = await query("DELETE FROM categories WHERE id = $1 RETURNING id, name", [categoryId]);

    if (!deleteResult.rows[0]) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    const removedCategoryName = deleteResult.rows[0].name;
    const updateProductsResult = await query(
      `UPDATE products
       SET categories = array_remove(categories, $1)
       WHERE categories @> ARRAY[$1]::text[]`,
      [removedCategoryName]
    );

    return res.json({
      success: true,
      removedCategory: removedCategoryName,
      updatedProducts: updateProductsResult.rowCount
    });
  } catch {
    return res.status(500).json({ error: "No se pudo eliminar la categoría" });
  }
});

adminRouter.get("/shipping-rules/public", async (_req, res) => {
  try {
    const result = await query(
      `SELECT zone, base_cost_ars, free_shipping_from_ars, eta_min_days, eta_max_days
       FROM shipping_rules
       WHERE is_active = TRUE AND zone = ANY($1::text[])
       ORDER BY CASE zone
         WHEN 'caba' THEN 1
         WHEN 'gba' THEN 2
         WHEN 'retiro_local' THEN 3
         ELSE 99
       END`,
      [ALLOWED_SHIPPING_ZONES]
    );

    return res.json({
      items: result.rows.map((row) => ({
        zone: row.zone,
        baseCost: Number(row.base_cost_ars),
        freeShippingFrom: Number(row.free_shipping_from_ars),
        etaMinDays: row.eta_min_days,
        etaMaxDays: row.eta_max_days,
      }))
    });
  } catch {
    return res.status(500).json({ error: "No se pudieron obtener reglas de envío" });
  }
});

adminRouter.get("/shipping-rules", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, zone, base_cost_ars, free_shipping_from_ars, eta_min_days, eta_max_days, is_active
       FROM shipping_rules
       WHERE zone = ANY($1::text[])
       ORDER BY CASE zone
         WHEN 'caba' THEN 1
         WHEN 'gba' THEN 2
         WHEN 'retiro_local' THEN 3
         ELSE 99
       END, id ASC`,
      [ALLOWED_SHIPPING_ZONES]
    );

    return res.json({
      items: result.rows.map((row) => ({
        id: row.id,
        zone: row.zone,
        baseCost: Number(row.base_cost_ars),
        freeShippingFrom: Number(row.free_shipping_from_ars),
        etaMinDays: row.eta_min_days,
        etaMaxDays: row.eta_max_days,
        isActive: row.is_active
      }))
    });
  } catch {
    return res.status(500).json({ error: "No se pudieron obtener reglas de envío" });
  }
});

adminRouter.put("/shipping-rules/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const zone = normalizeText(req.body?.zone).toLowerCase();
  const baseCost = toNumber(req.body?.baseCost, NaN);
  const freeShippingFrom = toNumber(req.body?.freeShippingFrom, NaN);
  const etaMinDays = toInteger(req.body?.etaMinDays, NaN);
  const etaMaxDays = toInteger(req.body?.etaMaxDays, NaN);
  const isActive = typeof req.body?.isActive === "boolean" ? req.body.isActive : true;

  if (!zone || !Number.isFinite(baseCost) || !Number.isFinite(freeShippingFrom) || !Number.isInteger(etaMinDays) || !Number.isInteger(etaMaxDays)) {
    return res.status(400).json({ error: "Datos inválidos para regla de envío" });
  }

  if (!ALLOWED_SHIPPING_ZONES.includes(zone)) {
    return res.status(400).json({ error: "Zona de envío no permitida" });
  }

  if (baseCost < 0 || freeShippingFrom < 0 || etaMinDays <= 0 || etaMaxDays < etaMinDays) {
    return res.status(400).json({ error: "Valores fuera de rango" });
  }

  try {
    const result = await query(
      `UPDATE shipping_rules
       SET zone = $1,
           base_cost_ars = $2,
           free_shipping_from_ars = $3,
           eta_min_days = $4,
           eta_max_days = $5,
           is_active = $6
       WHERE id = $7
       RETURNING id, zone, base_cost_ars, free_shipping_from_ars, eta_min_days, eta_max_days, is_active`,
      [zone, baseCost, freeShippingFrom, etaMinDays, etaMaxDays, isActive, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Regla no encontrada" });
    }

    const row = result.rows[0];
    return res.json({
      item: {
        id: row.id,
        zone: row.zone,
        baseCost: Number(row.base_cost_ars),
        freeShippingFrom: Number(row.free_shipping_from_ars),
        etaMinDays: row.eta_min_days,
        etaMaxDays: row.eta_max_days,
        isActive: row.is_active
      }
    });
  } catch {
    return res.status(500).json({ error: "No se pudo actualizar la regla de envío" });
  }
});

adminRouter.post("/shipping/quote", async (req, res) => {
  const zone = normalizeText(req.body?.zone).toLowerCase();
  const subtotal = toNumber(req.body?.subtotal, NaN);

  if (!zone || !Number.isFinite(subtotal) || subtotal < 0) {
    return res.status(400).json({ error: "Datos inválidos para cotización de envío" });
  }

  if (!ALLOWED_SHIPPING_ZONES.includes(zone)) {
    return res.status(400).json({ error: "Zona de envío no disponible" });
  }

  try {
    const result = await query(
      `SELECT id, zone, base_cost_ars, free_shipping_from_ars, eta_min_days, eta_max_days
       FROM shipping_rules
       WHERE zone = $1 AND is_active = TRUE
       LIMIT 1`,
      [zone]
    );

    const rule = result.rows[0];

    if (!rule) {
      return res.status(404).json({ error: "Zona de envío no disponible" });
    }

    const freeShippingFrom = Number(rule.free_shipping_from_ars);
    const shippingCost = subtotal >= freeShippingFrom ? 0 : Number(rule.base_cost_ars);

    return res.json({
      zone: rule.zone,
      subtotal,
      shippingCost,
      freeShippingFrom,
      eta: {
        minDays: rule.eta_min_days,
        maxDays: rule.eta_max_days
      }
    });
  } catch {
    return res.status(500).json({ error: "No se pudo calcular el envío" });
  }
});

adminRouter.get("/promotions", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, code, name, type, value, min_qty, min_subtotal_ars, product_id, target_product_id, active, starts_at, ends_at
       FROM promotions
       ORDER BY id ASC`
    );

    return res.json({
      items: result.rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        type: row.type,
        value: Number(row.value),
        minQty: row.min_qty,
        minSubtotal: row.min_subtotal_ars === null ? null : Number(row.min_subtotal_ars),
        productId: row.product_id,
        targetProductId: row.target_product_id,
        active: row.active,
        startsAt: row.starts_at,
        endsAt: row.ends_at
      }))
    });
  } catch {
    return res.status(500).json({ error: "No se pudieron obtener promociones" });
  }
});

adminRouter.post("/promotions", requireAuth, requireAdmin, async (req, res) => {
  const code = normalizeText(req.body?.code).toUpperCase();
  const name = normalizeText(req.body?.name);
  const type = normalizeText(req.body?.type);
  const value = toNumber(req.body?.value, NaN);
  const minQty = req.body?.minQty == null || req.body?.minQty === "" ? null : toInteger(req.body?.minQty, NaN);
  const minSubtotal = req.body?.minSubtotal == null || req.body?.minSubtotal === "" ? null : toNumber(req.body?.minSubtotal, NaN);
  const productId = req.body?.productId == null || req.body?.productId === "" ? null : toInteger(req.body?.productId, NaN);
  const targetProductId = req.body?.targetProductId == null || req.body?.targetProductId === "" ? null : toInteger(req.body?.targetProductId, NaN);
  const active = typeof req.body?.active === "boolean" ? req.body.active : true;

  if (!code || !name || !type || !Number.isFinite(value)) {
    return res.status(400).json({ error: "Datos inválidos para promoción" });
  }

  try {
    const result = await query(
      `INSERT INTO promotions (code, name, type, value, min_qty, min_subtotal_ars, product_id, target_product_id, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, code, name, type, value, min_qty, min_subtotal_ars, product_id, target_product_id, active, starts_at, ends_at`,
      [code, name, type, value, minQty, minSubtotal, productId, targetProductId, active]
    );

    const row = result.rows[0];
    return res.status(201).json({
      item: {
        id: row.id,
        code: row.code,
        name: row.name,
        type: row.type,
        value: Number(row.value),
        minQty: row.min_qty,
        minSubtotal: row.min_subtotal_ars === null ? null : Number(row.min_subtotal_ars),
        productId: row.product_id,
        targetProductId: row.target_product_id,
        active: row.active,
        startsAt: row.starts_at,
        endsAt: row.ends_at
      }
    });
  } catch {
    return res.status(500).json({ error: "No se pudo crear la promoción" });
  }
});

adminRouter.post("/promotions/apply", async (req, res) => {
  const code = normalizeText(req.body?.code).toUpperCase();
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const subtotal = toNumber(req.body?.subtotal, NaN);
  const authUser = await resolveOptionalAuthUser(req);

  if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
    return res.status(400).json({ error: "Datos inválidos para cupón" });
  }

  try {
    const promoResult = await query(
      `SELECT id, code, name, type, value, min_qty, min_subtotal_ars, product_id, target_product_id
       FROM promotions
       WHERE code = $1
         AND active = TRUE
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (ends_at IS NULL OR ends_at >= NOW())
       LIMIT 1`,
      [code]
    );

    const promo = promoResult.rows[0];

    if (!promo) {
      return res.json({
        valid: false,
        error: "Cupón no válido o inactivo"
      });
    }

    if (promo.code === WELCOME_PROMO_CODE) {
      try {
        await ensureWelcomePromoEligibility(authUser);
      } catch (welcomeError) {
        return res.json({
          valid: false,
          error: welcomeError.message || "No se pudo aplicar el cupón"
        });
      }
    }

    const totalQty = items.reduce((sum, item) => sum + Math.max(0, toInteger(item.quantity, 0)), 0);

    if (promo.min_subtotal_ars !== null && subtotal < Number(promo.min_subtotal_ars)) {
      return res.json({
        valid: false,
        error: "No alcanzás el subtotal mínimo para este cupón"
      });
    }

    if (promo.min_qty !== null && totalQty < promo.min_qty) {
      return res.json({
        valid: false,
        error: "No alcanzás la cantidad mínima para este cupón"
      });
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

    return res.json({
      valid: true,
      code: promo.code,
      promotionName: promo.name,
      discount: Number(normalizedDiscount.toFixed(2)),
      totalWithDiscount: Number((subtotal - normalizedDiscount).toFixed(2))
    });
  } catch {
    return res.status(500).json({ error: "No se pudo aplicar el cupón" });
  }
});

adminRouter.get("/customers/history", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const customersResult = await query(
      `SELECT c.id, c.name, c.email, c.phone,
              c.avatar_url,
              c.member_status,
              c.last_activity,
              c.last_activity_at,
              c.primary_address,
              COUNT(o.id) AS orders_count,
              COALESCE(SUM(o.total_ars), 0) AS total_spent_ars,
              MAX(o.created_at) AS last_order_at
       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id
       GROUP BY c.id
       ORDER BY c.last_activity_at DESC NULLS LAST, total_spent_ars DESC, c.id ASC`
    );

    return res.json({
      items: customersResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        avatarUrl: row.avatar_url,
        memberStatus: row.member_status,
        lastActivity: row.last_activity,
        lastActivityAt: row.last_activity_at,
        address: row.primary_address,
        ordersCount: Number(row.orders_count),
        totalSpent: Number(row.total_spent_ars),
        lastOrderAt: row.last_order_at
      }))
    });
  } catch {
    return res.status(500).json({ error: "No se pudo obtener historial de clientes" });
  }
});

adminRouter.get("/administrators", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email
       FROM users
       WHERE role = 'admin'
       ORDER BY LOWER(name) ASC, id ASC`
    );

    return res.json({
      items: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email
      }))
    });
  } catch {
    return res.status(500).json({ error: "No se pudo obtener administradores" });
  }
});

adminRouter.get("/members", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, role, created_at
       FROM users
       ORDER BY created_at DESC, id DESC`
    );

    return res.json({
      items: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        createdAt: row.created_at
      }))
    });
  } catch {
    return res.status(500).json({ error: "No se pudo obtener miembros" });
  }
});

// Delete a single member
adminRouter.delete("/members/:id", requireAuth, requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);

  if (!Number.isInteger(targetId) || targetId <= 0) {
    return res.status(400).json({ error: "ID de usuario inválido" });
  }

  if (targetId === req.user.id) {
    return res.status(403).json({ error: "No podés eliminar tu propia cuenta" });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Delete from all tables that reference users
    await client.query("DELETE FROM ticket_attachments WHERE uploaded_by_user_id = $1", [targetId]);
    await client.query("DELETE FROM ticket_comments WHERE author_user_id = $1", [targetId]);
    await client.query("DELETE FROM ticket_history WHERE actor_user_id = $1", [targetId]);
    await client.query("DELETE FROM tickets WHERE requester_user_id = $1", [targetId]);
    await client.query("DELETE FROM user_carts WHERE user_id = $1", [targetId]);
    await client.query("DELETE FROM users WHERE id = $1", [targetId]);

    await client.query("COMMIT");
    return res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al eliminar usuario:", err.message);
    return res.status(500).json({ error: "No se pudo eliminar el usuario" });
  } finally {
    client.release();
  }
});

// Bulk delete members
adminRouter.delete("/members", requireAuth, requireAdmin, async (req, res) => {
  const ids = req.body?.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Debés enviar un array de IDs" });
  }

  const validIds = ids.map(Number).filter((id) => Number.isInteger(id) && id > 0);

  if (validIds.length === 0) {
    return res.status(400).json({ error: "Ningún ID válido recibido" });
  }

  if (validIds.includes(req.user.id)) {
    return res.status(403).json({ error: "No podés eliminar tu propia cuenta" });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM ticket_attachments WHERE uploaded_by_user_id = ANY($1)", [validIds]);
    await client.query("DELETE FROM ticket_comments WHERE author_user_id = ANY($1)", [validIds]);
    await client.query("DELETE FROM ticket_history WHERE actor_user_id = ANY($1)", [validIds]);
    await client.query("DELETE FROM tickets WHERE requester_user_id = ANY($1)", [validIds]);
    await client.query("DELETE FROM user_carts WHERE user_id = ANY($1)", [validIds]);
    const result = await client.query("DELETE FROM users WHERE id = ANY($1)", [validIds]);

    await client.query("COMMIT");
    return res.json({ success: true, deletedCount: result.rowCount });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al eliminar usuarios:", err.message);
    return res.status(500).json({ error: "No se pudieron eliminar los usuarios" });
  } finally {
    client.release();
  }
});

adminRouter.get("/customers/:id/reorder-items", requireAuth, requireAdmin, async (req, res) => {
  const customerId = Number(req.params.id);

  if (!Number.isInteger(customerId) || customerId <= 0) {
    return res.status(400).json({ error: "ID de cliente inválido" });
  }

  try {
    const result = await query(
      `SELECT oi.product_id,
              oi.product_name,
              oi.brand,
              AVG(oi.unit_price_ars) AS avg_unit_price_ars,
              SUM(oi.quantity) AS total_qty
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.customer_id = $1
       GROUP BY oi.product_id, oi.product_name, oi.brand
       ORDER BY total_qty DESC, oi.product_name ASC
       LIMIT 10`,
      [customerId]
    );

    return res.json({
      items: result.rows.map((row) => ({
        productId: row.product_id,
        productName: row.product_name,
        brand: row.brand,
        avgUnitPrice: Number(row.avg_unit_price_ars),
        totalQty: Number(row.total_qty)
      }))
    });
  } catch {
    return res.status(500).json({ error: "No se pudo obtener recompra rápida" });
  }
});

adminRouter.get("/customers/:id/activity", requireAuth, requireAdmin, async (req, res) => {
  const customerId = Number(req.params.id);

  if (!Number.isInteger(customerId) || customerId <= 0) {
    return res.status(400).json({ error: "ID de cliente inválido" });
  }

  try {
    const customerResult = await query(
      `SELECT id, name, created_at, member_status, last_activity, last_activity_at
       FROM customers
       WHERE id = $1
       LIMIT 1`,
      [customerId]
    );

    const customer = customerResult.rows[0];

    if (!customer) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    const ordersResult = await query(
      `SELECT id,
              wix_order_number,
              created_at,
              total_ars,
              payment_status,
              payment_method,
              currency
       FROM orders
       WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [customerId]
    );

    const events = [];

    events.push({
      id: `customer-created-${customer.id}`,
      message: "Contacto creado",
      at: customer.created_at,
      linkLabel: null,
      linkUrl: null
    });

    if (customer.member_status) {
      events.push({
        id: `customer-member-status-${customer.id}`,
        message: `Estado de miembro: ${customer.member_status}`,
        at: customer.created_at,
        linkLabel: null,
        linkUrl: null
      });
    }

    if (customer.last_activity) {
      events.push({
        id: `customer-last-activity-${customer.id}`,
        message: customer.last_activity,
        at: customer.last_activity_at || customer.created_at,
        linkLabel: null,
        linkUrl: null
      });
    }

    for (const order of ordersResult.rows) {
      const orderNumber = order.wix_order_number ? `#${order.wix_order_number}` : `#${order.id}`;

      events.push({
        id: `order-created-${order.id}`,
        message: `Nuevo pedido ${orderNumber} · ${Number(order.total_ars || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${String(order.currency || "ARS").toUpperCase()}`,
        at: order.created_at,
        linkLabel: "Ver pedido",
        linkUrl: null
      });

      if (String(order.payment_status || "").trim()) {
        events.push({
          id: `order-payment-${order.id}`,
          message: `Pago: ${order.payment_status}${order.payment_method ? ` (${order.payment_method === "cash" ? "Pago al retirar" : order.payment_method === "mercadopago" ? "Mercado Pago" : order.payment_method})` : ""}`,
          at: order.created_at,
          linkLabel: "Ver factura",
          linkUrl: null
        });
      }
    }

    events.sort((a, b) => {
      const aTime = Date.parse(a.at || "");
      const bTime = Date.parse(b.at || "");
      const safeA = Number.isNaN(aTime) ? 0 : aTime;
      const safeB = Number.isNaN(bTime) ? 0 : bTime;
      return safeB - safeA;
    });

    return res.json({
      customer: {
        id: customer.id,
        name: customer.name
      },
      items: events
    });
  } catch {
    return res.status(500).json({ error: "No se pudo obtener actividad del cliente" });
  }
});

adminRouter.get("/reports/sales-by-product", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await query(
      `SELECT oi.product_id,
              oi.product_name,
              COALESCE(oi.brand, p.brand) AS brand,
              SUM(oi.quantity) AS units_sold,
              SUM(oi.quantity * oi.unit_price_ars) AS sales_ars
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'cancelado'
       GROUP BY oi.product_id, oi.product_name, COALESCE(oi.brand, p.brand)
       ORDER BY sales_ars DESC, units_sold DESC`
    );

    return res.json({
      items: result.rows.map((row) => ({
        productId: row.product_id,
        productName: row.product_name,
        brand: row.brand,
        unitsSold: Number(row.units_sold),
        sales: Number(row.sales_ars)
      }))
    });
  } catch {
    return res.status(500).json({ error: "No se pudo obtener reporte por producto" });
  }
});

adminRouter.get("/analytics", requireAuth, requireAdmin, async (req, res) => {
  const range = resolveAnalyticsRange(req.query?.period, req.query?.days, req.query?.from, req.query?.to);
  const {
    period,
    days,
    from,
    to,
    previousFrom,
    previousTo
  } = range;

  try {
    const [
      summaryResult,
      previousSummaryResult,
      sessionResult,
      ordersResult,
      dailyResult,
      hourlyResult,
      weekdayHeatmapResult,
      topPagesResult,
      entryPagesResult,
      sourcesResult,
      previousSourcesResult,
      referrersResult,
      devicesResult,
      browsersResult,
      operatingSystemsResult,
      topMediumsResult,
      topCampaignsResult,
      topSearchTermsResult,
      topSelectedCategoriesResult,
      recentEventsResult
    ] = await Promise.all([
      query(
        `SELECT
           COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
           COUNT(*) FILTER (WHERE event_type <> 'page_view') AS total_clicks,
           COUNT(DISTINCT visitor_id) AS unique_visitors,
           COUNT(DISTINCT session_id) AS sessions,
           COUNT(DISTINCT visitor_id) FILTER (WHERE occurred_at >= NOW() - INTERVAL '5 minutes') AS live_visitors,
           COUNT(DISTINCT session_id) FILTER (WHERE occurred_at >= NOW() - INTERVAL '5 minutes') AS live_sessions,
           COUNT(DISTINCT session_id) FILTER (
             WHERE occurred_at >= DATE_TRUNC('day', NOW())
               AND occurred_at < DATE_TRUNC('day', NOW()) + INTERVAL '1 day'
           ) AS sessions_today,
           COUNT(DISTINCT session_id) FILTER (
             WHERE occurred_at >= DATE_TRUNC('day', NOW()) - INTERVAL '1 day'
               AND occurred_at < DATE_TRUNC('day', NOW())
           ) AS sessions_yesterday,
           COUNT(DISTINCT visitor_id) FILTER (
             WHERE occurred_at >= DATE_TRUNC('day', NOW())
               AND occurred_at < DATE_TRUNC('day', NOW()) + INTERVAL '1 day'
           ) AS visitors_today,
           COUNT(DISTINCT visitor_id) FILTER (
             WHERE occurred_at >= DATE_TRUNC('day', NOW()) - INTERVAL '1 day'
               AND occurred_at < DATE_TRUNC('day', NOW())
           ) AS visitors_yesterday,
           COUNT(*) FILTER (
             WHERE event_type <> 'page_view'
               AND occurred_at >= DATE_TRUNC('day', NOW())
               AND occurred_at < DATE_TRUNC('day', NOW()) + INTERVAL '1 day'
           ) AS clicks_today,
           COUNT(*) FILTER (
             WHERE event_type <> 'page_view'
               AND occurred_at >= DATE_TRUNC('day', NOW()) - INTERVAL '1 day'
               AND occurred_at < DATE_TRUNC('day', NOW())
           ) AS clicks_yesterday,
           COUNT(DISTINCT visitor_id) FILTER (
             WHERE visitor_id IS NOT NULL
               AND EXISTS (
                 SELECT 1
                 FROM web_analytics_events previous_event
                 WHERE previous_event.visitor_id = web_analytics_events.visitor_id
                   AND previous_event.occurred_at < $1
               )
           ) AS returning_visitors
         FROM web_analytics_events
         WHERE occurred_at >= $1 AND occurred_at < $2`,
        [from, to]
      ),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
           COUNT(*) FILTER (WHERE event_type <> 'page_view') AS total_clicks,
           COUNT(DISTINCT visitor_id) AS unique_visitors,
           COUNT(DISTINCT session_id) AS sessions
         FROM web_analytics_events
         WHERE occurred_at >= $1 AND occurred_at < $2`,
        [previousFrom, previousTo]
      ),
      query(
        `WITH session_stats AS (
           SELECT
             session_id,
             MIN(occurred_at) AS first_at,
             MAX(occurred_at) AS last_at,
             COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views
           FROM web_analytics_events
           WHERE occurred_at >= $1
             AND occurred_at < $2
             AND session_id IS NOT NULL
           GROUP BY session_id
         )
         SELECT
           COUNT(*) AS sessions,
           COALESCE(AVG(EXTRACT(EPOCH FROM (last_at - first_at))), 0) AS avg_session_duration_seconds,
           COALESCE(AVG(page_views), 0) AS avg_pages_per_session,
           COUNT(*) FILTER (WHERE page_views <= 1) AS bounced_sessions
         FROM session_stats`,
        [from, to]
      ),
      query(
        `SELECT
           COUNT(*) AS orders,
           COALESCE(SUM(total_ars), 0) AS revenue,
           COALESCE(AVG(total_ars), 0) AS avg_order_value
         FROM orders
         WHERE status <> 'cancelado'
           AND created_at >= $1
           AND created_at < $2`,
        [from, to]
      ),
      query(
        `SELECT
           TO_CHAR(DATE_TRUNC('day', occurred_at), 'YYYY-MM-DD') AS day,
           COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
           COUNT(*) FILTER (WHERE event_type <> 'page_view') AS clicks,
           COUNT(DISTINCT visitor_id) AS unique_visitors,
           COUNT(DISTINCT session_id) AS sessions
         FROM web_analytics_events
         WHERE occurred_at >= $1 AND occurred_at < $2
         GROUP BY 1
         ORDER BY 1 ASC`,
        [from, to]
      ),
      query(
        `SELECT
           EXTRACT(HOUR FROM occurred_at)::int AS hour,
           COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
           COUNT(DISTINCT session_id) AS sessions
         FROM web_analytics_events
         WHERE occurred_at >= $1 AND occurred_at < $2
         GROUP BY 1
         ORDER BY 1 ASC`,
        [from, to]
      ),
      query(
        `SELECT
           EXTRACT(ISODOW FROM occurred_at)::int AS weekday,
           EXTRACT(HOUR FROM occurred_at)::int AS hour,
           COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views
         FROM web_analytics_events
         WHERE occurred_at >= $1 AND occurred_at < $2
         GROUP BY 1, 2
         ORDER BY 1 ASC, 2 ASC`,
        [from, to]
      ),
      query(
        `SELECT
           COALESCE(NULLIF(path, ''), '/') AS path,
           COUNT(*) FILTER (WHERE event_type = 'page_view') AS views,
           COUNT(DISTINCT session_id) AS sessions,
           COUNT(DISTINCT visitor_id) AS visitors
         FROM web_analytics_events
         WHERE occurred_at >= $1
           AND occurred_at < $2
           AND event_type = 'page_view'
         GROUP BY 1
         ORDER BY views DESC, sessions DESC
         LIMIT 12`,
        [from, to]
      ),
      query(
        `WITH first_page AS (
           SELECT DISTINCT ON (session_id)
             session_id,
             COALESCE(NULLIF(path, ''), '/') AS path
           FROM web_analytics_events
           WHERE occurred_at >= $1
             AND occurred_at < $2
             AND event_type = 'page_view'
             AND session_id IS NOT NULL
           ORDER BY session_id, occurred_at ASC
         )
         SELECT path, COUNT(*) AS sessions
         FROM first_page
         GROUP BY path
         ORDER BY sessions DESC
         LIMIT 10`,
        [from, to]
      ),
      query(
        `WITH first_touch AS (
           SELECT DISTINCT ON (session_id)
             session_id,
             COALESCE(NULLIF(source, ''), 'directo') AS source
           FROM web_analytics_events
           WHERE occurred_at >= $1
             AND occurred_at < $2
             AND session_id IS NOT NULL
           ORDER BY session_id, occurred_at ASC
         )
         SELECT source, COUNT(*) AS sessions
         FROM first_touch
         GROUP BY source
         ORDER BY sessions DESC
         LIMIT 10`,
        [from, to]
      ),
      query(
        `WITH first_touch AS (
           SELECT DISTINCT ON (session_id)
             session_id,
             COALESCE(NULLIF(source, ''), 'directo') AS source
           FROM web_analytics_events
           WHERE occurred_at >= $1
             AND occurred_at < $2
             AND session_id IS NOT NULL
           ORDER BY session_id, occurred_at ASC
         )
         SELECT source, COUNT(*) AS sessions
         FROM first_touch
         GROUP BY source
         ORDER BY sessions DESC
         LIMIT 20`,
        [previousFrom, previousTo]
      ),
      query(
        `SELECT
           COALESCE(NULLIF(referrer_host, ''), 'directo') AS referrer,
           COUNT(*) FILTER (WHERE event_type = 'page_view') AS visits
         FROM web_analytics_events
         WHERE occurred_at >= $1
           AND occurred_at < $2
         GROUP BY 1
         ORDER BY visits DESC
         LIMIT 10`,
        [from, to]
      ),
      query(
        `SELECT
           COALESCE(NULLIF(device_type, ''), 'unknown') AS device,
           COUNT(*) AS events,
           COUNT(DISTINCT session_id) AS sessions
         FROM web_analytics_events
         WHERE occurred_at >= $1
           AND occurred_at < $2
         GROUP BY 1
         ORDER BY sessions DESC, events DESC
         LIMIT 10`,
        [from, to]
      ),
      query(
        `SELECT
           COALESCE(NULLIF(browser_name, ''), 'Other') AS browser,
           COUNT(*) AS events,
           COUNT(DISTINCT session_id) AS sessions
         FROM web_analytics_events
         WHERE occurred_at >= $1
           AND occurred_at < $2
         GROUP BY 1
         ORDER BY sessions DESC, events DESC
         LIMIT 10`,
        [from, to]
      ),
      query(
        `SELECT
           COALESCE(NULLIF(os_name, ''), 'Other') AS os,
           COUNT(*) AS events,
           COUNT(DISTINCT session_id) AS sessions
         FROM web_analytics_events
         WHERE occurred_at >= $1
           AND occurred_at < $2
         GROUP BY 1
         ORDER BY sessions DESC, events DESC
         LIMIT 10`,
        [from, to]
      ),
      query(
        `WITH first_touch AS (
           SELECT DISTINCT ON (session_id)
             session_id,
             COALESCE(NULLIF(medium, ''), '(sin medio)') AS medium
           FROM web_analytics_events
           WHERE occurred_at >= $1
             AND occurred_at < $2
             AND session_id IS NOT NULL
           ORDER BY session_id, occurred_at ASC
         )
         SELECT medium, COUNT(*) AS sessions
         FROM first_touch
         GROUP BY medium
         ORDER BY sessions DESC
         LIMIT 10`,
        [from, to]
      ),
      query(
        `WITH first_touch AS (
           SELECT DISTINCT ON (session_id)
             session_id,
             COALESCE(NULLIF(campaign, ''), '(sin campaña)') AS campaign
           FROM web_analytics_events
           WHERE occurred_at >= $1
             AND occurred_at < $2
             AND session_id IS NOT NULL
           ORDER BY session_id, occurred_at ASC
         )
         SELECT campaign, COUNT(*) AS sessions
         FROM first_touch
         GROUP BY campaign
         ORDER BY sessions DESC
         LIMIT 10`,
        [from, to]
      ),
      query(
        `WITH searches AS (
           SELECT LOWER(TRIM(COALESCE(metadata->>'query', ''))) AS query
           FROM web_analytics_events
           WHERE occurred_at >= $1
             AND occurred_at < $2
             AND event_type = 'search'
         ),
         words AS (
           SELECT REGEXP_SPLIT_TO_TABLE(query, E'\\s+') AS word
           FROM searches
         )
         SELECT word,
                COUNT(*) AS searches
         FROM words
         WHERE word <> ''
           AND LENGTH(word) >= 2
           AND word !~ '^[0-9]+$'
         GROUP BY word
         ORDER BY searches DESC, word ASC
         LIMIT 12`,
        [from, to]
      ),
      query(
        `SELECT
           COALESCE(NULLIF(TRIM(metadata->>'categoryName'), ''), 'Sin categoría') AS category,
           COUNT(*) AS selections
         FROM web_analytics_events
         WHERE occurred_at >= $1
           AND occurred_at < $2
           AND event_type = 'category_select'
         GROUP BY 1
         ORDER BY selections DESC, category ASC
         LIMIT 12`,
        [from, to]
      ),
      query(
        `SELECT
           occurred_at,
           event_type,
           COALESCE(NULLIF(path, ''), '/') AS path,
           COALESCE(NULLIF(source, ''), 'directo') AS source,
           COALESCE(NULLIF(device_type, ''), 'unknown') AS device_type,
           COALESCE(NULLIF(browser_name, ''), 'Other') AS browser_name,
           COALESCE(NULLIF(os_name, ''), 'Other') AS os_name,
           COALESCE(NULLIF(referrer_host, ''), 'directo') AS referrer_host,
           session_id,
           visitor_id,
           metadata
         FROM web_analytics_events
         WHERE occurred_at >= $1
           AND occurred_at < $2
         ORDER BY occurred_at DESC
         LIMIT 30`,
        [from, to]
      )
    ]);

    const summaryRow = summaryResult.rows[0] || {};
    const previousSummaryRow = previousSummaryResult.rows[0] || {};
    const sessionRow = sessionResult.rows[0] || {};
    const ordersRow = ordersResult.rows[0] || {};

    const pageViews = Number(summaryRow.page_views || 0);
    const totalClicks = Number(summaryRow.total_clicks || 0);
    const uniqueVisitors = Number(summaryRow.unique_visitors || 0);
    const sessions = Number(summaryRow.sessions || 0);
    const liveVisitors = Number(summaryRow.live_visitors || 0);
    const liveSessions = Number(summaryRow.live_sessions || 0);
    const sessionsToday = Number(summaryRow.sessions_today || 0);
    const sessionsYesterday = Number(summaryRow.sessions_yesterday || 0);
    const visitorsToday = Number(summaryRow.visitors_today || 0);
    const visitorsYesterday = Number(summaryRow.visitors_yesterday || 0);
    const clicksToday = Number(summaryRow.clicks_today || 0);
    const clicksYesterday = Number(summaryRow.clicks_yesterday || 0);
    const returningVisitors = Number(summaryRow.returning_visitors || 0);
    const bouncedSessions = Number(sessionRow.bounced_sessions || 0);
    const avgSessionDurationSeconds = Number(sessionRow.avg_session_duration_seconds || 0);
    const avgPagesPerSession = Number(sessionRow.avg_pages_per_session || 0);
    const orders = Number(ordersRow.orders || 0);
    const revenue = Number(ordersRow.revenue || 0);
    const avgOrderValue = Number(ordersRow.avg_order_value || 0);
    const bounceRate = sessions > 0 ? (bouncedSessions / sessions) * 100 : 0;
    const conversionRate = sessions > 0 ? (orders / sessions) * 100 : 0;

    const previousPageViews = Number(previousSummaryRow.page_views || 0);
    const previousClicks = Number(previousSummaryRow.total_clicks || 0);
    const previousUniqueVisitors = Number(previousSummaryRow.unique_visitors || 0);
    const previousSessions = Number(previousSummaryRow.sessions || 0);
    const previousSourcesMap = new Map(
      previousSourcesResult.rows.map((row) => [String(row.source || "directo"), Number(row.sessions || 0)])
    );
    const sourcePerformance = sourcesResult.rows.map((row) => {
      const source = String(row.source || "directo");
      const sourceSessions = Number(row.sessions || 0);
      const previousSourceSessions = previousSourcesMap.get(source) || 0;
      const sharePct = sessions > 0 ? (sourceSessions / sessions) * 100 : 0;

      return {
        source,
        sessions: sourceSessions,
        previousSessions: previousSourceSessions,
        deltaPct: percentDelta(sourceSessions, previousSourceSessions),
        sharePct,
        channel: classifyTrafficChannel(source, "")
      };
    });

    return res.json({
      range: {
        period,
        days,
        from: from.toISOString(),
        to: to.toISOString(),
        previousFrom: previousFrom.toISOString(),
        previousTo: previousTo.toISOString()
      },
      summary: {
        pageViews,
        totalClicks,
        uniqueVisitors,
        sessions,
        liveVisitors,
        liveSessions,
        sessionsToday,
        sessionsYesterday,
        visitorsToday,
        visitorsYesterday,
        clicksToday,
        clicksYesterday,
        returningVisitors,
        bounceRate,
        avgSessionDurationSeconds,
        avgPagesPerSession,
        orders,
        revenue,
        avgOrderValue,
        conversionRate
      },
      comparison: {
        pageViewsPct: percentDelta(pageViews, previousPageViews),
        clicksPct: percentDelta(totalClicks, previousClicks),
        uniqueVisitorsPct: percentDelta(uniqueVisitors, previousUniqueVisitors),
        sessionsPct: percentDelta(sessions, previousSessions)
      },
      charts: {
        daily: dailyResult.rows.map((row) => ({
          day: row.day,
          pageViews: Number(row.page_views || 0),
          clicks: Number(row.clicks || 0),
          uniqueVisitors: Number(row.unique_visitors || 0),
          sessions: Number(row.sessions || 0)
        })),
        hourly: hourlyResult.rows.map((row) => ({
          hour: Number(row.hour || 0),
          pageViews: Number(row.page_views || 0),
          sessions: Number(row.sessions || 0)
        })),
        weekdayHeatmap: weekdayHeatmapResult.rows.map((row) => ({
          weekday: Number(row.weekday || 0),
          hour: Number(row.hour || 0),
          pageViews: Number(row.page_views || 0)
        }))
      },
      breakdown: {
        topPages: topPagesResult.rows.map((row) => ({
          path: row.path,
          views: Number(row.views || 0),
          sessions: Number(row.sessions || 0),
          visitors: Number(row.visitors || 0)
        })),
        entryPages: entryPagesResult.rows.map((row) => ({
          path: row.path,
          sessions: Number(row.sessions || 0)
        })),
        sources: sourcesResult.rows.map((row) => ({
          source: row.source,
          sessions: Number(row.sessions || 0)
        })),
        sourcePerformance,
        referrers: referrersResult.rows.map((row) => ({
          referrer: row.referrer,
          visits: Number(row.visits || 0)
        })),
        devices: devicesResult.rows.map((row) => ({
          device: row.device,
          events: Number(row.events || 0),
          sessions: Number(row.sessions || 0)
        })),
        browsers: browsersResult.rows.map((row) => ({
          browser: row.browser,
          events: Number(row.events || 0),
          sessions: Number(row.sessions || 0)
        })),
        operatingSystems: operatingSystemsResult.rows.map((row) => ({
          os: row.os,
          events: Number(row.events || 0),
          sessions: Number(row.sessions || 0)
        })),
        topMediums: topMediumsResult.rows.map((row) => ({
          medium: row.medium,
          sessions: Number(row.sessions || 0)
        })),
        topCampaigns: topCampaignsResult.rows.map((row) => ({
          campaign: row.campaign,
          sessions: Number(row.sessions || 0)
        })),
        topSearchTerms: topSearchTermsResult.rows.map((row) => ({
          term: row.word,
          searches: Number(row.searches || 0)
        })),
        topSelectedCategories: topSelectedCategoriesResult.rows.map((row) => ({
          category: row.category,
          selections: Number(row.selections || 0)
        }))
      },
      recentEvents: recentEventsResult.rows.map((row) => ({
        at: row.occurred_at,
        eventType: row.event_type,
        path: row.path,
        source: row.source,
        deviceType: row.device_type,
        browserName: row.browser_name,
        osName: row.os_name,
        referrerHost: row.referrer_host,
        sessionId: row.session_id,
        visitorId: row.visitor_id,
        metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {}
      }))
    });
  } catch {
    return res.status(500).json({ error: "No se pudieron obtener analíticas" });
  }
});

adminRouter.get("/reports/sales-by-brand", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await query(
      `SELECT COALESCE(oi.brand, p.brand, 'Sin marca') AS brand,
              SUM(oi.quantity) AS units_sold,
              SUM(oi.quantity * oi.unit_price_ars) AS sales_ars
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'cancelado'
       GROUP BY COALESCE(oi.brand, p.brand, 'Sin marca')
       ORDER BY sales_ars DESC, units_sold DESC`
    );

    return res.json({
      items: result.rows.map((row) => ({
        brand: row.brand,
        unitsSold: Number(row.units_sold),
        sales: Number(row.sales_ars)
      }))
    });
  } catch {
    return res.status(500).json({ error: "No se pudo obtener reporte por marca" });
  }
});

adminRouter.get("/analytics/user-sessions", requireAuth, requireAdmin, async (req, res) => {
  const range = resolveAnalyticsRange(req.query?.period, req.query?.days, req.query?.from, req.query?.to);
  const { from, to } = range;

  try {
    const sessionsResult = await query(
      `WITH session_data AS (
         SELECT
           e.session_id,
           MAX(e.visitor_id) AS visitor_id,
           MAX(e.user_id) AS user_id,
           MAX(e.device_type) AS device_type,
           MAX(e.browser_name) AS browser_name,
           MAX(e.os_name) AS os_name,
           MAX(e.source) AS source,
           MIN(e.occurred_at) AS session_start,
           MAX(e.occurred_at) AS session_end,
           COUNT(*) AS total_events,
           COUNT(*) FILTER (WHERE e.event_type = 'page_view') AS page_views,
           COUNT(*) FILTER (WHERE e.event_type = 'add_to_cart') AS cart_adds,
           COUNT(*) FILTER (WHERE e.event_type = 'product_view') AS product_views,
           COUNT(*) FILTER (WHERE e.event_type = 'search') AS searches,
           COUNT(*) FILTER (WHERE e.event_type = 'begin_checkout') AS checkouts,
           COUNT(*) FILTER (WHERE e.event_type = 'category_select') AS category_selects,
           COUNT(*) FILTER (WHERE e.event_type NOT IN ('page_view', 'add_to_cart', 'product_view', 'search', 'begin_checkout', 'category_select')) AS other_clicks
         FROM web_analytics_events e
         WHERE e.occurred_at >= $1
           AND e.occurred_at < $2
           AND e.session_id IS NOT NULL
         GROUP BY e.session_id
       )
       SELECT
         sd.*,
         EXTRACT(EPOCH FROM (sd.session_end - sd.session_start)) AS duration_seconds,
         u.name AS user_name,
         u.email AS user_email
       FROM session_data sd
       LEFT JOIN users u ON u.id = sd.user_id
       ORDER BY sd.session_start DESC
       LIMIT 200`,
      [from, to]
    );

    const sessionIds = sessionsResult.rows.map((r) => r.session_id).filter(Boolean);

    let timelineRows = [];
    if (sessionIds.length > 0) {
      const timelineResult = await query(
        `SELECT
           session_id,
           event_type,
           path,
           occurred_at,
           metadata
         FROM web_analytics_events
         WHERE session_id = ANY($1)
           AND occurred_at >= $2
           AND occurred_at < $3
         ORDER BY occurred_at ASC`,
        [sessionIds, from, to]
      );
      timelineRows = timelineResult.rows;
    }

    const timelineBySession = new Map();
    for (const row of timelineRows) {
      const sid = row.session_id;
      if (!timelineBySession.has(sid)) {
        timelineBySession.set(sid, []);
      }
      timelineBySession.get(sid).push({
        eventType: row.event_type,
        path: row.path || "/",
        at: row.occurred_at,
        metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {}
      });
    }

    const sessions = sessionsResult.rows.map((row) => ({
      sessionId: row.session_id,
      visitorId: row.visitor_id,
      userId: row.user_id ? Number(row.user_id) : null,
      userName: row.user_name || null,
      userEmail: row.user_email || null,
      isLoggedIn: Boolean(row.user_id),
      deviceType: row.device_type || "unknown",
      browserName: row.browser_name || "Other",
      osName: row.os_name || "Other",
      source: row.source || "directo",
      sessionStart: row.session_start,
      sessionEnd: row.session_end,
      durationSeconds: Number(row.duration_seconds || 0),
      totalEvents: Number(row.total_events || 0),
      pageViews: Number(row.page_views || 0),
      cartAdds: Number(row.cart_adds || 0),
      productViews: Number(row.product_views || 0),
      searches: Number(row.searches || 0),
      checkouts: Number(row.checkouts || 0),
      categorySelects: Number(row.category_selects || 0),
      otherClicks: Number(row.other_clicks || 0),
      timeline: timelineBySession.get(row.session_id) || []
    }));

    const totalSessions = sessions.length;
    const loggedInSessions = sessions.filter((s) => s.isLoggedIn).length;
    const anonymousSessions = totalSessions - loggedInSessions;
    const avgDuration = totalSessions > 0 ? sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / totalSessions : 0;
    const totalCartAdds = sessions.reduce((sum, s) => sum + s.cartAdds, 0);
    const totalProductViews = sessions.reduce((sum, s) => sum + s.productViews, 0);
    const totalCheckouts = sessions.reduce((sum, s) => sum + s.checkouts, 0);

    return res.json({
      range: {
        from: from.toISOString(),
        to: to.toISOString()
      },
      summary: {
        totalSessions,
        loggedInSessions,
        anonymousSessions,
        avgDurationSeconds: avgDuration,
        totalCartAdds,
        totalProductViews,
        totalCheckouts
      },
      sessions
    });
  } catch (err) {
    console.error("[analytics/user-sessions]", err);
    return res.status(500).json({ error: "No se pudieron obtener sesiones de usuario" });
  }
});

export default adminRouter;
