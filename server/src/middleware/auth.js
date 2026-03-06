import jwt from "jsonwebtoken";
import { query } from "../db.js";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");

    const userId = Number(payload?.id);
    const userEmail = typeof payload?.email === "string" ? payload.email.toLowerCase().trim() : "";

    let userResult;

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
      return res.status(401).json({ error: "Token inválido" });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Acceso solo para administradores" });
  }

  return next();
}
