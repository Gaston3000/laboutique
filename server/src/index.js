import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
      `SELECT id, name, seo, created_at
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
      const lastmod = row.created_at ? new Date(row.created_at).toISOString() : null;

      return {
        loc,
        changefreq: "weekly",
        priority: "0.7",
        lastmod
      };
    });

    const allUrls = [...staticUrls, ...productUrls]
      .map((entry) => {
        const lastmodTag = entry.lastmod ? `<lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : "";
        return `<url><loc>${xmlEscape(entry.loc)}</loc>${lastmodTag}<changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`;
      })
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${allUrls}</urlset>`;
    res.type("application/xml; charset=utf-8").send(xml);
  } catch {
    res.status(500).type("application/xml; charset=utf-8").send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>no se pudo generar sitemap</error>");
  }
});

app.use("/api/health", healthRouter);
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
