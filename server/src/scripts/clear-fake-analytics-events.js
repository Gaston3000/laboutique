import { query } from "../db.js";

const SEED_TAG = "preview_fake_analytics_v1";

async function clearFakeAnalyticsEvents() {
  try {
    const result = await query(
      `DELETE FROM web_analytics_events
       WHERE metadata->>'seedTag' = $1`,
      [SEED_TAG]
    );

    console.log(`Eventos fake eliminados: ${result.rowCount}`);
    console.log(`Seed tag: ${SEED_TAG}`);
  } catch (error) {
    console.error("No se pudieron eliminar eventos fake", error);
    process.exitCode = 1;
  }
}

clearFakeAnalyticsEvents();
