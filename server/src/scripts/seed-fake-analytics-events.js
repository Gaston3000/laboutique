import { db, query } from "../db.js";

const SEED_TAG = "preview_fake_analytics_v1";
const TOTAL_VISITORS = 180;

const trafficSources = [
  { source: "directo", medium: "organic", campaign: "", referrerHost: "" },
  { source: "google", medium: "organic", campaign: "", referrerHost: "google.com" },
  { source: "instagram", medium: "social", campaign: "reels-febrero", referrerHost: "instagram.com" },
  { source: "facebook", medium: "social", campaign: "remarketing-limpieza", referrerHost: "facebook.com" },
  { source: "newsletter", medium: "email", campaign: "promo-semanal", referrerHost: "mail.google.com" },
  { source: "google_ads", medium: "cpc", campaign: "search-detergente", referrerHost: "google.com" }
];

const paths = [
  "/",
  "/#productos",
  "/#promociones",
  "/#categoria/detergentes",
  "/#categoria/desinfectantes",
  "/#categoria/perfumes",
  "/#categoria/lavandinas",
  "/#carrito"
];

const searchTerms = [
  "detergente",
  "lavandina",
  "desinfectante",
  "suavizante",
  "limpiador multiuso",
  "perfume textil",
  "jabon liquido",
  "quitamanchas"
];

const categories = [
  "Detergentes",
  "Lavandinas",
  "Desinfectantes",
  "Perfumes",
  "Accesorios",
  "Jabones",
  "Quitamanchas"
];

const devices = [
  {
    deviceType: "mobile",
    browserName: "Chrome",
    osName: "Android",
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Mobile Safari/537.36",
    screenWidth: 412,
    screenHeight: 915,
    viewportWidth: 412,
    viewportHeight: 780
  },
  {
    deviceType: "desktop",
    browserName: "Chrome",
    osName: "Windows",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
    screenWidth: 1920,
    screenHeight: 1080,
    viewportWidth: 1366,
    viewportHeight: 768
  },
  {
    deviceType: "desktop",
    browserName: "Safari",
    osName: "macOS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    screenWidth: 1728,
    screenHeight: 1117,
    viewportWidth: 1280,
    viewportHeight: 800
  }
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(items) {
  return items[randomInt(0, items.length - 1)];
}

function buildTimestamp(daysBack = 45) {
  const now = Date.now();
  const maxOffset = daysBack * 24 * 60 * 60 * 1000;
  return new Date(now - Math.random() * maxOffset);
}

function eventTypeForIndex(index, total) {
  if (index === 0) {
    return "page_view";
  }

  const progress = index / Math.max(1, total - 1);
  const roll = Math.random();

  if (progress > 0.7 && roll < 0.08) return "begin_checkout";
  if (roll < 0.46) return "page_view";
  if (roll < 0.64) return "product_view";
  if (roll < 0.77) return "search";
  if (roll < 0.9) return "category_select";
  return "add_to_cart";
}

async function insertEvent(eventData) {
  await query(
    `INSERT INTO web_analytics_events (
      event_type,
      visitor_id,
      session_id,
      path,
      full_url,
      referrer,
      referrer_host,
      source,
      medium,
      campaign,
      term,
      content,
      device_type,
      browser_name,
      os_name,
      user_agent,
      language,
      screen_width,
      screen_height,
      viewport_width,
      viewport_height,
      timezone,
      metadata,
      occurred_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb, $24
    )`,
    [
      eventData.eventType,
      eventData.visitorId,
      eventData.sessionId,
      eventData.path,
      `https://laboutique.com${eventData.path}`,
      eventData.referrer,
      eventData.referrerHost,
      eventData.source,
      eventData.medium,
      eventData.campaign,
      "",
      "",
      eventData.device.deviceType,
      eventData.device.browserName,
      eventData.device.osName,
      eventData.device.userAgent,
      "es-AR",
      eventData.device.screenWidth,
      eventData.device.screenHeight,
      eventData.device.viewportWidth,
      eventData.device.viewportHeight,
      "America/Argentina/Buenos_Aires",
      JSON.stringify(eventData.metadata),
      eventData.occurredAt
    ]
  );
}

async function seed() {
  const client = await db.connect();
  let inserted = 0;

  try {
    await client.query("BEGIN");

    for (let visitorIndex = 1; visitorIndex <= TOTAL_VISITORS; visitorIndex += 1) {
      const visitorId = `fake-visitor-${visitorIndex}`;
      const sessionsCount = randomInt(1, 6);

      for (let sessionIndex = 1; sessionIndex <= sessionsCount; sessionIndex += 1) {
        const sessionId = `fake-session-${visitorIndex}-${sessionIndex}`;
        const sourceInfo = randomPick(trafficSources);
        const device = randomPick(devices);
        const eventsInSession = randomInt(3, 18);
        let occurredAt = buildTimestamp(45);

        for (let eventIndex = 0; eventIndex < eventsInSession; eventIndex += 1) {
          const eventType = eventTypeForIndex(eventIndex, eventsInSession);
          const path = randomPick(paths);

          const metadata = {
            isFake: true,
            seedTag: SEED_TAG,
            channel: sourceInfo.medium,
            visitorIndex,
            sessionIndex
          };

          if (eventType === "search") {
            metadata.query = randomPick(searchTerms);
          }

          if (eventType === "category_select") {
            metadata.categoryName = randomPick(categories);
          }

          await client.query(
            `INSERT INTO web_analytics_events (
              event_type,
              visitor_id,
              session_id,
              path,
              full_url,
              referrer,
              referrer_host,
              source,
              medium,
              campaign,
              term,
              content,
              device_type,
              browser_name,
              os_name,
              user_agent,
              language,
              screen_width,
              screen_height,
              viewport_width,
              viewport_height,
              timezone,
              metadata,
              occurred_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '', '', $11, $12, $13, $14, 'es-AR', $15, $16, $17, $18, 'America/Argentina/Buenos_Aires', $19::jsonb, $20
            )`,
            [
              eventType,
              visitorId,
              sessionId,
              path,
              `https://laboutique.com${path}`,
              sourceInfo.referrerHost ? `https://${sourceInfo.referrerHost}/` : "",
              sourceInfo.referrerHost,
              sourceInfo.source,
              sourceInfo.medium,
              sourceInfo.campaign,
              device.deviceType,
              device.browserName,
              device.osName,
              device.userAgent,
              device.screenWidth,
              device.screenHeight,
              device.viewportWidth,
              device.viewportHeight,
              JSON.stringify(metadata),
              occurredAt
            ]
          );

          inserted += 1;
          occurredAt = new Date(occurredAt.getTime() + randomInt(20, 240) * 1000);
        }
      }
    }

    await client.query("COMMIT");
    console.log(`Eventos fake insertados: ${inserted}`);
    console.log(`Seed tag: ${SEED_TAG}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("No se pudieron insertar eventos fake", error);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

seed();
