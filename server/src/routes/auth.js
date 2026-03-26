import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendVerificationCodeEmail, sendWelcomeEmail, sendPasswordResetEmail } from "../services/emailService.js";

const authRouter = Router();
const USER_SELECT_FIELDS = "id, name, first_name, last_name, profile_title, phone, avatar_url, email, role, address, preferred_delivery_zone, email_verified, welcome_discount_active, welcome_discount_expires_at, welcome_discount_used";

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
    preferredDeliveryZone: (() => { try { return JSON.parse(row.preferred_delivery_zone); } catch { return null; } })(),
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
    const existingUserResult = await query("SELECT id, email_verified FROM users WHERE email = $1 LIMIT 1", [normalizedEmail]);
    const existingUser = existingUserResult.rows[0];

    if (existingUser) {
      // If the existing user already verified their email, block re-registration
      if (existingUser.email_verified) {
        return res.status(409).json({ error: "Ya existe una cuenta registrada con ese email" });
      }

      // User exists but never verified — update their data and resend a fresh code
      const passwordHash = await bcrypt.hash(String(password), 10);
      const verificationCode = generateVerificationCode();
      const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await query(
        `UPDATE users
         SET name = $1, password_hash = $2, phone = $3, address = $4,
             verification_code = $5, verification_code_expires_at = $6
         WHERE id = $7`,
        [normalizedName, passwordHash, normalizedPhone, addressForStorage, verificationCode, codeExpiresAt, existingUser.id]
      );

      sendVerificationCodeEmail(normalizedEmail, { userName: normalizedName, verificationCode }).catch((err) =>
        console.error("Failed to send verification email:", err)
      );

      return res.status(201).json({
        message: "Te reenviamos un código de verificación.",
        user: { email: normalizedEmail, emailVerified: false },
        requiresVerification: true
      });
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
      return res.status(401).json({ error: "No encontramos una cuenta con ese email", errorField: "email" });
    }

    // Account created via Google without password
    if (!userRow.password_hash) {
      return res.status(401).json({ error: "Esta cuenta fue creada con Google. Usá el botón de Google para ingresar.", errorField: "email" });
    }

    const isValidPassword = await bcrypt.compare(password, userRow.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "La contraseña ingresada es incorrecta", errorField: "password" });
    }

    // Block login if the account was never verified (admins are exempt)
    if (!userRow.email_verified && userRow.role !== "admin") {
      return res.status(403).json({
        error: "Tu cuenta no fue verificada. Revisá tu email e ingresá el código, o reenvialo.",
        notVerified: true,
        email: userRow.email
      });
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

  try {
    const updatedUserResult = await query(
      `UPDATE users
       SET address = $1
       WHERE id = $2
       RETURNING ${USER_SELECT_FIELDS}`,
      [normalizedAddress || null, req.user.id]
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

// Save preferred delivery zone
authRouter.patch("/me/delivery-zone", requireAuth, async (req, res) => {
  const { city, zone, postalCode } = req.body || {};
  const validZones = ["caba", "gba"];
  if (!city || !validZones.includes(zone)) {
    return res.status(400).json({ error: "Zona inválida" });
  }
  const payload = JSON.stringify({ city: String(city).slice(0, 100), zone, postalCode: String(postalCode || "").slice(0, 10) });
  try {
    await query("UPDATE users SET preferred_delivery_zone = $1 WHERE id = $2", [payload, req.user.id]);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "No se pudo guardar la zona" });
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

    // Mark email as verified, clear verification code only
    const updatedUserResult = await query(
      `UPDATE users 
       SET email_verified = TRUE,
           verification_code = NULL,
           verification_code_expires_at = NULL
       WHERE id = $1
       RETURNING ${USER_SELECT_FIELDS}`,
      [userRow.id]
    );

    const verifiedUser = mapUserRow(updatedUserResult.rows[0]);
    const token = signToken(verifiedUser);

    // Send welcome email (don't block response if email fails)
    sendWelcomeEmail(verifiedUser.email, verifiedUser.name).catch((err) =>
      console.error("Failed to send welcome email:", err.message)
    );

    return res.json({
      message: "Email verificado exitosamente",
      token,
      user: verifiedUser,
      welcomeDiscountActivated: false
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

// Manually activate welcome discount for logged-in user
authRouter.post("/activate-welcome-discount", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check current state
    const userResult = await query(
      `SELECT welcome_discount_active, welcome_discount_used FROM users WHERE id = $1`,
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    if (user.welcome_discount_active) {
      return res.status(400).json({ error: "El descuento ya fue activado" });
    }
    if (user.welcome_discount_used) {
      return res.status(400).json({ error: "El descuento ya fue utilizado" });
    }

    const welcomeDiscountExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const updatedResult = await query(
      `UPDATE users
       SET welcome_discount_active = TRUE,
           welcome_discount_expires_at = $2,
           welcome_discount_used = FALSE
       WHERE id = $1
       RETURNING ${USER_SELECT_FIELDS}`,
      [userId, welcomeDiscountExpiresAt]
    );

    const updatedUser = mapUserRow(updatedResult.rows[0]);
    const token = signToken(updatedUser);

    return res.json({
      message: "Descuento de bienvenida activado",
      token,
      user: updatedUser,
      welcomeDiscountActivated: true
    });
  } catch (error) {
    console.error("Activate welcome discount error:", error);
    return res.status(500).json({ error: "No se pudo activar el descuento" });
  }
});

// Request password reset code
authRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = String(email || "").toLowerCase().trim();

  if (!normalizedEmail) {
    return res.status(400).json({ error: "El email es obligatorio" });
  }

  try {
    const userResult = await query(
      "SELECT id, name, email FROM users WHERE email = $1 AND email_verified = TRUE LIMIT 1",
      [normalizedEmail]
    );

    const user = userResult.rows[0];

    // Always return success to avoid email enumeration
    if (!user) {
      return res.json({ message: "Si el email está registrado, recibirás un código." });
    }

    const resetCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await query(
      "UPDATE users SET reset_password_code = $1, reset_password_code_expires_at = $2 WHERE id = $3",
      [resetCode, expiresAt, user.id]
    );

    sendPasswordResetEmail(normalizedEmail, { userName: user.name, resetCode }).catch((err) =>
      console.error("Failed to send password reset email:", err.message)
    );

    return res.json({ message: "Si el email está registrado, recibirás un código." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "No se pudo procesar la solicitud" });
  }
});

// Reset password with code
authRouter.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const normalizedCode = String(code || "").trim();

  if (!normalizedEmail || !normalizedCode || !newPassword) {
    return res.status(400).json({ error: "Email, código y nueva contraseña son obligatorios" });
  }

  if (String(newPassword).length < 4) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 4 caracteres" });
  }

  try {
    const userResult = await query(
      `SELECT id, reset_password_code, reset_password_code_expires_at FROM users WHERE email = $1 LIMIT 1`,
      [normalizedEmail]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (!user.reset_password_code) {
      return res.status(400).json({ error: "No hay código de recuperación activo" });
    }

    if (new Date() > new Date(user.reset_password_code_expires_at)) {
      return res.status(400).json({ error: "El código expiró. Solicitá uno nuevo." });
    }

    if (user.reset_password_code !== normalizedCode) {
      return res.status(400).json({ error: "Código incorrecto" });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);

    await query(
      "UPDATE users SET password_hash = $1, reset_password_code = NULL, reset_password_code_expires_at = NULL WHERE id = $2",
      [passwordHash, user.id]
    );

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "No se pudo restablecer la contraseña" });
  }
});

// Google OAuth login/register
authRouter.post("/google", async (req, res) => {
  const { access_token } = req.body || {};

  if (!access_token) {
    return res.status(400).json({ error: "Token de Google requerido" });
  }

  try {
    // Verify access token by fetching user info from Google
    const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (!googleRes.ok) {
      return res.status(401).json({ error: "Token de Google inválido" });
    }

    const payload = await googleRes.json();
    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const name = payload.name || email.split("@")[0];
    const avatarUrl = payload.picture || null;

    // Check if user exists by google_id or email
    const existingResult = await query(
      `SELECT ${USER_SELECT_FIELDS}, google_id FROM users WHERE google_id = $1 OR email = $2 LIMIT 1`,
      [googleId, email]
    );

    let user;

    if (existingResult.rows[0]) {
      const existingRow = existingResult.rows[0];

      // Link Google account if not already linked
      if (!existingRow.google_id) {
        await query(
          "UPDATE users SET google_id = $1, auth_provider = 'both', email_verified = TRUE WHERE id = $2",
          [googleId, existingRow.id]
        );
      } else if (!existingRow.email_verified) {
        await query("UPDATE users SET email_verified = TRUE WHERE id = $1", [existingRow.id]);
      }

      const refreshedResult = await query(`SELECT ${USER_SELECT_FIELDS} FROM users WHERE id = $1`, [existingRow.id]);
      user = mapUserRow(refreshedResult.rows[0]);
    } else {
      // Create new user (no password needed for Google-only users)
      const createdResult = await query(
        `INSERT INTO users (name, email, role, password_hash, google_id, auth_provider, email_verified, avatar_url)
         VALUES ($1, $2, 'client', NULL, $3, 'google', TRUE, $4)
         RETURNING ${USER_SELECT_FIELDS}`,
        [name, email, googleId, avatarUrl]
      );

      user = mapUserRow(createdResult.rows[0]);

      sendWelcomeEmail(email, { userName: name }).catch((err) =>
        console.error("Failed to send welcome email:", err.message)
      );
    }

    const token = signToken(user);
    return res.json({ token, user });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(401).json({ error: "No se pudo verificar el token de Google" });
  }
});

export default authRouter;
