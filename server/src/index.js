import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { bootstrapDatabase } from "./bootstrap.js";

import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import analyticsRouter from "./routes/analytics.js";
import cartRouter from "./routes/cart.js";
import healthRouter from "./routes/health.js";
import ordersRouter from "./routes/orders.js";
import productsRouter from "./routes/products.js";
import ticketsRouter from "./routes/tickets.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

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
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.json({
    name: "La Boutique de la Limpieza API",
    version: "1.0.0"
  });
});

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/cart", cartRouter);
app.use("/api/tickets", ticketsRouter);

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
