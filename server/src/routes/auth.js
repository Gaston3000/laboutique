import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const authRouter = Router();
const USER_SELECT_FIELDS = "id, name, first_name, last_name, profile_title, phone, avatar_url, email, role, address";

function normalizeAddress(address) {
  return String(address || "").trim();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeOptionalText(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    profileTitle: row.profile_title || "",
    phone: row.phone || "",
    avatarUrl: row.avatar_url || "",
    email: row.email,
    role: row.role,
    address: row.address
  };
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      profileTitle: user.profileTitle,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      email: user.email,
      address: user.address
    },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "12h" }
  );
}

authRouter.post("/register", async (req, res) => {
  const { name, email, password, address } = req.body || {};
  const normalizedName = normalizeText(name);
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const normalizedAddress = normalizeAddress(address);
  const addressForStorage = normalizedAddress || null;

  if (!normalizedName || !normalizedEmail || !password) {
    return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
  }

  if (String(password).length < 4) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 4 caracteres" });
  }

  try {
    const existingUserResult = await query("SELECT id FROM users WHERE email = $1 LIMIT 1", [normalizedEmail]);

    if (existingUserResult.rows[0]) {
      return res.status(409).json({ error: "Ya existe una cuenta registrada con ese email" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const createdUserResult = await query(
      `INSERT INTO users (name, email, role, password_hash, address)
       VALUES ($1, $2, 'client', $3, $4)
       RETURNING ${USER_SELECT_FIELDS}`,
      [normalizedName, normalizedEmail, passwordHash, addressForStorage]
    );

    const createdUser = mapUserRow(createdUserResult.rows[0]);
    const token = signToken(createdUser);

    return res.status(201).json({
      token,
      user: createdUser
    });
  } catch {
    return res.status(500).json({ error: "No se pudo registrar la cuenta" });
  }
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son obligatorios" });
  }

  try {
    const result = await query(
      `SELECT ${USER_SELECT_FIELDS}, password_hash FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    const userRow = result.rows[0];

    if (!userRow) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const isValidPassword = await bcrypt.compare(password, userRow.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const user = mapUserRow(userRow);
    const token = signToken(user);

    return res.json({
      token,
      user
    });
  } catch {
    return res.status(500).json({ error: "No se pudo iniciar sesión" });
  }
});

authRouter.patch("/me/address", requireAuth, async (req, res) => {
  const normalizedAddress = normalizeAddress(req.body?.address);

  if (!normalizedAddress) {
    return res.status(400).json({ error: "La dirección es obligatoria" });
  }

  try {
    const updatedUserResult = await query(
      `UPDATE users
       SET address = $1
       WHERE id = $2
       RETURNING ${USER_SELECT_FIELDS}`,
      [normalizedAddress, req.user.id]
    );

    const updatedUser = mapUserRow(updatedUserResult.rows[0]);

    if (!updatedUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const token = signToken(updatedUser);

    return res.json({ token, user: updatedUser });
  } catch {
    return res.status(500).json({ error: "No se pudo actualizar la dirección" });
  }
});

authRouter.patch("/me/profile", requireAuth, async (req, res) => {
  const displayName = normalizeText(req.body?.displayName);
  const firstName = normalizeOptionalText(req.body?.firstName);
  const lastName = normalizeOptionalText(req.body?.lastName);
  const profileTitle = normalizeOptionalText(req.body?.profileTitle);
  const phone = normalizeOptionalText(req.body?.phone);
  const avatarUrl = normalizeOptionalText(req.body?.avatarUrl);

  try {
    const currentUserResult = await query(`SELECT ${USER_SELECT_FIELDS} FROM users WHERE id = $1 LIMIT 1`, [req.user.id]);
    const currentUser = currentUserResult.rows[0];

    if (!currentUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const fullNameFromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
    const nextDisplayName = displayName || fullNameFromParts || normalizeText(currentUser.name);

    if (!nextDisplayName) {
      return res.status(400).json({ error: "Ingresá un nombre visible o nombre y apellido." });
    }

    const updatedUserResult = await query(
      `UPDATE users
       SET name = $1,
           first_name = $2,
           last_name = $3,
           profile_title = $4,
           phone = $5,
           avatar_url = $6
       WHERE id = $7
       RETURNING ${USER_SELECT_FIELDS}`,
      [nextDisplayName, firstName, lastName, profileTitle, phone, avatarUrl, req.user.id]
    );

    const updatedUser = mapUserRow(updatedUserResult.rows[0]);
    const token = signToken(updatedUser);

    return res.json({ token, user: updatedUser });
  } catch {
    return res.status(500).json({ error: "No se pudo actualizar el perfil" });
  }
});

export default authRouter;
