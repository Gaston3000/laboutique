import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { bootstrapDatabase } from "./bootstrap.js";
import { query } from "./db.js";

import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import analyticsRouter from "./routes/analytics.js";
import cartRouter from "./routes/cart.js";
import healthRouter from "./routes/health.js";
import ordersRouter from "./routes/orders.js";
import productsRouter from "./routes/products.js";
import ticketsRouter from "./routes/tickets.js";
import emailsRouter from "./routes/emails.js";
import notificationsRouter from "./routes/notifications.js";
import aiRouter from "./routes/ai.js";

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, "../.env") });

// ── Validación de variables de entorno críticas ─────────────────────────────
function validateRequiredEnvVars() {
  const required = [
    { key: "DATABASE_URL",               fatal: true  },
    { key: "JWT_SECRET",                 fatal: true  },
    { key: "MERCADOPAGO_ACCESS_TOKEN",   fatal: false },
    { key: "MERCADOPAGO_WEBHOOK_SECRET", fatal: false },
    { key: "RESEND_API_KEY",             fatal: false },
    { key: "CLIENT_URL",                 fatal: false },
    { key: "ANTHROPIC_API_KEY",          fatal: false },
  ];

  let hasFatal = false;

  for (const { key, fatal } of required) {
    const value = String(process.env[key] || "").trim();
    if (!value) {
      if (fatal) {
        console.error(`❌ FALTA VARIABLE DE ENTORNO CRÍTICA: ${key}`);
        hasFatal = true;
      } else {
        console.warn(`⚠️  Variable de entorno faltante: ${key} (algunas funciones no funcionarán)`);
      }
    }
  }

  if (process.env.JWT_SECRET === "dev-secret" || process.env.JWT_SECRET === "super-secreto-laboutique") {
    console.warn("⚠️  JWT_SECRET usa un valor por defecto. Cambiar antes de ir a producción.");
  }

  if (hasFatal) {
    console.error("El servidor no puede iniciar sin las variables críticas.");
    process.exit(1);
  }
}

// ── Rate limiters ────────────────────────────────────────────────────────────
// Login: 10 intentos por 15 minutos (anti brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Esperá 15 minutos antes de volver a intentar." }
});

// Registro: 5 cuentas nuevas por hora desde la misma IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas cuentas creadas desde esta IP. Intentá más tarde." }
});

// Checkout: 15 intentos por 15 minutos (evita spam de pedidos)
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de compra. Esperá unos minutos." }
});

// API general: 300 requests por minuto (protección broad)
const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Reducí la frecuencia de pedidos." },
  skip: (req) => req.method === "OPTIONS"
});

const app = express();
const port = process.env.PORT || 4000;

// Gzip/deflate compression – reduces response size ~60-80%
app.use(compression());

// Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
app.use(
  helmet({
    // Allow cross-origin requests for images/fonts loaded by the SPA
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Disable CSP for now – the SPA injects inline scripts (JSON-LD, analytics)
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    origin(origin, callback) {
      const configuredOrigin = process.env.CLIENT_URL || "http://localhost:5173";
      const isProduction = process.env.NODE_ENV === "production";

      // En producción: solo permitir el origen configurado
      if (isProduction) {
        if (!origin || origin === configuredOrigin) {
          callback(null, true);
        } else {
          callback(new Error("Origen no permitido por CORS"));
        }
        return;
      }

      // En desarrollo: también permitir localhost en cualquier puerto
      if (!origin || origin === configuredOrigin) {
        callback(null, true);
        return;
      }

      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
      if (isLocalhost) {
        callback(null, true);
        return;
      }

      callback(new Error("Origen no permitido por CORS"));
    }
  })
);
app.use(express.json());
// Para soportar webhooks que envían x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// Static uploads with long-term cache (images rarely change, URL includes unique name)
app.use(
  "/uploads",
  express.static(path.resolve(process.cwd(), "uploads"), {
    maxAge: "30d",
    immutable: true,
    etag: true
  })
);

app.get("/", (_req, res) => {
  res.json({
    name: "La Boutique de la Limpieza API", //cart/mercadopago/webhook
    version: "1.0.0"
  });
});

app.post("/cart/mercadopago/webhook", (req, res) => {
  console.log("Webhook recibido:", req.body);
  res.status(200).send("OK");
});

function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toSeoSlug(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPublicSiteBaseUrl() {
  const configured = String(process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || "").trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "http://localhost:5173";
}

// Google Search Console verification file
app.get("/googlee7e466e36a84516f.html", (_req, res) => {
  res.type("text/html").send("google-site-verification: googlee7e466e36a84516f.html");
});

app.get("/robots.txt", (_req, res) => {
  const siteBaseUrl = getPublicSiteBaseUrl();
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${siteBaseUrl}/sitemap.xml`
  ].join("\n");

  res.type("text/plain; charset=utf-8").send(body);
});

app.get("/sitemap.xml", async (_req, res) => {
  try {
    const siteBaseUrl = getPublicSiteBaseUrl();
    const result = await query(
      `SELECT id, name, seo, media, created_at
       FROM products
       WHERE is_visible = TRUE
       ORDER BY id ASC`
    );

    const staticUrls = [
      { loc: `${siteBaseUrl}/`, changefreq: "daily", priority: "1.0" },
      { loc: `${siteBaseUrl}/?seccion=promociones`, changefreq: "weekly", priority: "0.8" }
    ];

    const productUrls = result.rows.map((row) => {
      const seo = row.seo && typeof row.seo === "object" ? row.seo : {};
      const explicitSlug = String(seo.slug || "").trim();
      const fallbackSlug = toSeoSlug(`${String(row.name || "")} ${String(row.id || "")}`);
      const slug = explicitSlug || fallbackSlug;
      const loc = `${siteBaseUrl}/?producto=${encodeURIComponent(slug)}`;
      const lastmod = row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : null;

      // Build image tags for this product
      const media = Array.isArray(row.media) ? row.media : [];
      const images = media
        .map((item) => {
          const url = typeof item === "string" ? item : (item?.url || item?.src || "");
          return String(url).trim();
        })
        .filter((url) => {
          if (!url) return false;
          // Only include absolute URLs (skip relative paths that may not resolve)
          return url.startsWith("http://") || url.startsWith("https://");
        })
        .slice(0, 5); // Google allows max 1000 images per URL but keep it reasonable

      const imageTags = images.map((imgUrl) =>
        `<image:image><image:loc>${xmlEscape(imgUrl)}</image:loc><image:title>${xmlEscape(String(row.name || ""))}</image:title></image:image>`
      ).join("");

      return { loc, changefreq: "weekly", priority: "0.8", lastmod, imageTags };
    });

    const allUrls = [...staticUrls.map((u) => ({ ...u, imageTags: "" })), ...productUrls]
      .map((entry) => {
        const lastmodTag = entry.lastmod ? `<lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : "";
        return `<url><loc>${xmlEscape(entry.loc)}</loc>${lastmodTag}<changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority>${entry.imageTags || ""}</url>`;
      })
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${allUrls}</urlset>`;
    res.type("application/xml; charset=utf-8").send(xml);
  } catch {
    res.status(500).type("application/xml; charset=utf-8").send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>no se pudo generar sitemap</error>");
  }
});

// ── Bot prerender ─────────────────────────────────────────────────────────────
// Returns server-rendered HTML for crawlers (Googlebot, Facebook, WhatsApp, etc.)
// that don't execute JavaScript and can't see the React-injected meta tags.
//
// Usage:
//   GET /prerender?producto=<slug>
//
// In production (Nginx), you can route bot traffic to this endpoint:
//   if ($http_user_agent ~* "googlebot|facebookexternalhit|Twitterbot|WhatsApp|Telegram") {
//     proxy_pass http://localhost:4000/prerender$is_args$args;
//   }

const BOT_UA_PATTERN = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|embedly|quora|pinterest|vkshare|w3c_validator|ia_archiver|semrushbot|ahrefsbot|mj12bot/i;

function isBotUserAgent(ua) {
  return BOT_UA_PATTERN.test(ua || "");
}

function buildPrerenderHtml({ title, description, image, canonical, keywords, price, brand, availability, jsonLd }) {
  const safeAttr = (v) => String(v || "").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>${safeAttr(title)}</title>
<meta name="description" content="${safeAttr(description)}"/>
${keywords ? `<meta name="keywords" content="${safeAttr(keywords)}"/>` : ""}
<meta name="robots" content="index,follow,max-image-preview:large"/>
<meta property="og:type" content="product"/>
<meta property="og:site_name" content="La Boutique de la Limpieza"/>
<meta property="og:locale" content="es_AR"/>
<meta property="og:title" content="${safeAttr(title)}"/>
<meta property="og:description" content="${safeAttr(description)}"/>
${image ? `<meta property="og:image" content="${safeAttr(image)}"/>` : ""}
<meta property="og:url" content="${safeAttr(canonical)}"/>
${brand ? `<meta property="og:brand" content="${safeAttr(brand)}"/>` : ""}
<meta property="product:price:currency" content="ARS"/>
${price != null ? `<meta property="product:price:amount" content="${safeAttr(String(price))}"/>` : ""}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${safeAttr(title)}"/>
<meta name="twitter:description" content="${safeAttr(description)}"/>
${image ? `<meta name="twitter:image" content="${safeAttr(image)}"/>` : ""}
<link rel="canonical" href="${safeAttr(canonical)}"/>
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ""}
</head>
<body>
<h1>${safeAttr(title)}</h1>
<p>${safeAttr(description)}</p>
${image ? `<img src="${safeAttr(image)}" alt="${safeAttr(title)}"/>` : ""}
${price != null ? `<p>Precio: $${safeAttr(String(price))} ARS${availability ? "" : " (Sin stock)"}</p>` : ""}
<p><a href="${safeAttr(canonical)}">Ver producto en La Boutique de la Limpieza</a></p>
</body>
</html>`;
}

app.get("/prerender", async (req, res) => {
  try {
    const siteBaseUrl = getPublicSiteBaseUrl();
    const productSlug = String(req.query.producto || "").trim();

    if (!productSlug) {
      return res.redirect(302, siteBaseUrl);
    }

    // Try to find the product by seo.slug first, then by name-id slug fallback
    const result = await query(
      `SELECT id, name, brand, short_description, long_description, price_ars AS price,
              stock, categories, media, seo
       FROM products
       WHERE is_visible = TRUE
       ORDER BY id ASC`
    );

    let matchedRow = null;
    for (const row of result.rows) {
      const seo = row.seo && typeof row.seo === "object" ? row.seo : {};
      const explicitSlug = String(seo.slug || "").trim();
      const fallbackSlug = toSeoSlug(`${String(row.name || "")} ${String(row.id || "")}`);
      const rowSlug = explicitSlug || fallbackSlug;
      if (rowSlug === productSlug) {
        matchedRow = row;
        break;
      }
    }

    if (!matchedRow) {
      return res.redirect(302, siteBaseUrl);
    }

    const seo = matchedRow.seo && typeof matchedRow.seo === "object" ? matchedRow.seo : {};
    const siteName = "La Boutique de la Limpieza";
    const baseName = String(matchedRow.name || "").trim();
    const title = String(seo.metaTitle || "").trim() || `${baseName} | ${siteName}`;
    const description = String(seo.metaDescription || "").trim()
      || String(matchedRow.short_description || "").trim()
      || String(matchedRow.long_description || "").trim().slice(0, 160)
      || `Conocé ${baseName} en La Boutique de la Limpieza.`;
    const keywords = Array.isArray(seo.keywords) ? seo.keywords.filter(Boolean).join(", ") : "";
    const media = Array.isArray(matchedRow.media) ? matchedRow.media : [];
    const firstImage = media
      .map((item) => (typeof item === "string" ? item : (item?.url || item?.src || "")))
      .find((url) => url.startsWith("http://") || url.startsWith("https://"))
      || "";
    const canonical = `${siteBaseUrl}/?producto=${encodeURIComponent(productSlug)}`;
    const price = Number(matchedRow.price || 0);
    const inStock = Number(matchedRow.stock || 0) > 0;
    const brand = String(matchedRow.brand || "").trim();
    const categories = Array.isArray(matchedRow.categories) ? matchedRow.categories : [];

    const jsonLdData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: baseName,
      url: canonical,
      description,
      ...(firstImage ? { image: [firstImage] } : {}),
      sku: String(matchedRow.id),
      ...(brand ? { brand: { "@type": "Brand", name: brand }, manufacturer: { "@type": "Organization", name: brand } } : {}),
      ...(categories.length ? { category: categories[0] } : {}),
      offers: {
        "@type": "Offer",
        url: canonical,
        priceCurrency: "ARS",
        price,
        availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: siteName }
      }
    };

    const jsonLd = JSON.stringify(jsonLdData);
    const html = buildPrerenderHtml({ title, description, image: firstImage, canonical, keywords, price, brand, availability: inStock, jsonLd });

    res.type("text/html; charset=utf-8").send(html);
  } catch (err) {
    console.error("Prerender error:", err);
    res.redirect(302, getPublicSiteBaseUrl());
  }
});

// ── Static React app serving (production) ────────────────────────────────────
// If client/dist exists (built), Express serves the React SPA directly.
// This is optional — if you use Nginx as a static file server, skip this.
const clientDistPath = path.resolve(__dirname, "../../client/dist");
const clientDistExists = existsSync(path.join(clientDistPath, "index.html"));

if (clientDistExists) {
  // Serve built assets
  app.use(express.static(clientDistPath, { maxAge: "1h" }));
}

// ── Bot prerender middleware ───────────────────────────────────────────────────
// Intercepts bot requests for product pages and serves pre-rendered HTML.
// Works both when Express serves the SPA and when Nginx does (bots are forwarded
// to the /prerender endpoint by Nginx, which hits this server).
app.use((req, res, next) => {
  const ua = req.get("user-agent") || "";
  const productSlug = String(req.query.producto || "").trim();

  if (isBotUserAgent(ua) && productSlug && (req.path === "/" || req.path === "")) {
    // Rewrite to the prerender endpoint
    req.url = `/prerender?producto=${encodeURIComponent(productSlug)}`;
  }

  next();
});

if (clientDistExists) {
  // SPA fallback for all non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

// ── Limiter global para toda la API
app.use("/api", generalApiLimiter);

app.use("/api/health", healthRouter);

// Rate limiting específico en endpoints sensibles
app.post("/api/auth/login",    loginLimiter);
app.post("/api/auth/register", registerLimiter);
app.post("/api/cart/checkout", checkoutLimiter);

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/cart", cartRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/emails", emailsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/ai", aiRouter);

async function startServer() {
  validateRequiredEnvVars();
  try {
    await bootstrapDatabase();
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("No se pudo inicializar la base de datos", error);
    process.exit(1);
  }
}

startServer();
