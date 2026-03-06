import bcrypt from "bcryptjs";
import { db, query } from "../db.js";

const defaultUser = {
  name: "Usuario",
  email: "usuario@local.test",
  password: "Usuario123",
  address: "Corrientes 100",
  role: "client"
};

async function createOrUpdateDefaultClientUser() {
  try {
    const passwordHash = await bcrypt.hash(defaultUser.password, 10);

    const result = await query(
      `INSERT INTO users (name, email, role, password_hash, address)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email)
       DO UPDATE SET
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         password_hash = EXCLUDED.password_hash,
         address = EXCLUDED.address
       RETURNING id, name, email, role, address`,
      [defaultUser.name, defaultUser.email, defaultUser.role, passwordHash, defaultUser.address]
    );

    const user = result.rows[0];

    console.log("Usuario cliente guardado correctamente:");
    console.log({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address
    });
  } catch (error) {
    console.error("No se pudo crear/actualizar el usuario cliente", error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

createOrUpdateDefaultClientUser();