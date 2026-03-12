import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendVerificationCodeEmail } from "../services/emailService.js";

const authRouter = Router();
const USER_SELECT_FIELDS = "id, name, first_name, last_name, profile_title, phone, avatar_url, email, role, address, email_verified, welcome_discount_active, welcome_discount_expires_at, welcome_discount_used";

// Generate 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    address: row.address,
    emailVerified: row.email_verified || false,
    welcomeDiscountActive: row.welcome_discount_active || false,
    welcomeDiscountExpiresAt: row.welcome_discount_expires_at || null,
    welcomeDiscountUsed: row.welcome_discount_used || false
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
      address: user.address,
      welcomeDiscountActive: user.welcomeDiscountActive,
      welcomeDiscountExpiresAt: user.welcomeDiscountExpiresAt,
      welcomeDiscountUsed: user.welcomeDiscountUsed
    },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "12h" }
  );
}

authRouter.post("/register", async (req, res) => {
  const { name, email, password, phone, address } = req.body || {};
  const normalizedName = normalizeText(name);
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const normalizedPhone = normalizeOptionalText(phone);
  const normalizedAddress = normalizeAddress(address);
  const addressForStorage = normalizedAddress || null;

  if (!normalizedName || !normalizedEmail || !password) {
    return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
  }

  if (!normalizedPhone) {
    return res.status(400).json({ error: "El teléfono es obligatorio" });
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
    const verificationCode = generateVerificationCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const createdUserResult = await query(
      `INSERT INTO users (name, email, role, password_hash, phone, address, verification_code, verification_code_expires_at, email_verified)
       VALUES ($1, $2, 'client', $3, $4, $5, $6, $7, FALSE)
       RETURNING ${USER_SELECT_FIELDS}`,
      [normalizedName, normalizedEmail, passwordHash, normalizedPhone, addressForStorage, verificationCode, codeExpiresAt]
    );

    const createdUser = mapUserRow(createdUserResult.rows[0]);
    
    // Send verification email (don't block response if email fails)
    sendVerificationCodeEmail(normalizedEmail, {
      userName: normalizedName,
      verificationCode
    }).catch((err) => {
      console.error("Failed to send verification email:", err);
    });

    // Return user data but without token - they need to verify first
    return res.status(201).json({
      message: "Cuenta creada. Por favor verificá tu email.",
      user: {
        email: createdUser.email,
        emailVerified: false
      },
      requiresVerification: true
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

// Verify email with code
authRouter.post("/verify-email", async (req, res) => {
  const { email, code } = req.body || {};
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const normalizedCode = String(code || "").trim();

  if (!normalizedEmail || !normalizedCode) {
    return res.status(400).json({ error: "Email y código son obligatorios" });
  }

  try {
    const userResult = await query(
      `SELECT ${USER_SELECT_FIELDS}, password_hash, verification_code, verification_code_expires_at
       FROM users 
       WHERE email = $1 
       LIMIT 1`,
      [normalizedEmail]
    );

    const userRow = userResult.rows[0];

    if (!userRow) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (userRow.email_verified) {
      return res.status(400).json({ error: "Esta cuenta ya está verificada" });
    }

    if (!userRow.verification_code) {
      return res.status(400).json({ error: "No hay código de verificación activo" });
    }

    if (new Date() > new Date(userRow.verification_code_expires_at)) {
      return res.status(400).json({ error: "El código expiró. Solicitá uno nuevo." });
    }

    if (userRow.verification_code !== normalizedCode) {
      return res.status(400).json({ error: "Código incorrecto" });
    }

    // Mark email as verified, clear verification code, and activate welcome discount (24h)
    const welcomeDiscountExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const updatedUserResult = await query(
      `UPDATE users 
       SET email_verified = TRUE,
           verification_code = NULL,
           verification_code_expires_at = NULL,
           welcome_discount_active = TRUE,
           welcome_discount_expires_at = $2,
           welcome_discount_used = FALSE
       WHERE id = $1
       RETURNING ${USER_SELECT_FIELDS}`,
      [userRow.id, welcomeDiscountExpiresAt]
    );

    const verifiedUser = mapUserRow(updatedUserResult.rows[0]);
    const token = signToken(verifiedUser);

    return res.json({
      message: "Email verificado exitosamente",
      token,
      user: verifiedUser,
      welcomeDiscountActivated: true
    });
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({ error: "No se pudo verificar el email" });
  }
});

// Resend verification code
authRouter.post("/resend-verification", async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = String(email || "").toLowerCase().trim();

  if (!normalizedEmail) {
    return res.status(400).json({ error: "Email es obligatorio" });
  }

  try {
    const userResult = await query(
      `SELECT id, name, email, email_verified FROM users WHERE email = $1 LIMIT 1`,
      [normalizedEmail]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: "Esta cuenta ya está verificada" });
    }

    // Generate new code
    const verificationCode = generateVerificationCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await query(
      `UPDATE users 
       SET verification_code = $1,
           verification_code_expires_at = $2
       WHERE id = $3`,
      [verificationCode, codeExpiresAt, user.id]
    );

    // Send email
    await sendVerificationCodeEmail(normalizedEmail, {
      userName: user.name,
      verificationCode
    });

    return res.json({
      message: "Código de verificación reenviado"
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({ error: "No se pudo reenviar el código" });
  }
});

export default authRouter;
