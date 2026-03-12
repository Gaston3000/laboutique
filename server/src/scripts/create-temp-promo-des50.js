import { db, query } from "../db.js";

async function createOrUpdateTempPromo() {
  try {
    const result = await query(
      `INSERT INTO promotions (
        code,
        name,
        type,
        value,
        active,
        starts_at,
        ends_at
      )
      VALUES (
        'DES50',
        'Descuento temporal 50%',
        'percent',
        50,
        TRUE,
        NOW(),
        NOW() + INTERVAL '7 days'
      )
      ON CONFLICT (code)
      DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        value = EXCLUDED.value,
        active = EXCLUDED.active,
        starts_at = EXCLUDED.starts_at,
        ends_at = EXCLUDED.ends_at
      RETURNING id, code, name, type, value, active, starts_at, ends_at`
    );

    const promo = result.rows[0];

    console.log("Cupon temporal guardado correctamente:");
    console.log({
      id: promo.id,
      code: promo.code,
      name: promo.name,
      type: promo.type,
      value: Number(promo.value),
      active: promo.active,
      startsAt: promo.starts_at,
      endsAt: promo.ends_at
    });
  } catch (error) {
    console.error("No se pudo crear/actualizar el cupon temporal DES50", error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

createOrUpdateTempPromo();
