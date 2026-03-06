import { Router } from "express";
import { query } from "../db.js";

const analyticsRouter = Router();

function normalizeText(value, maxLength = 255) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.slice(0, maxLength);
}

function normalizeInteger(value, fallback = null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
}

function normalizeEventType(value) {
  const eventType = normalizeText(value, 48).toLowerCase().replace(/[^a-z0-9_\-]/g, "_");
  return eventType || "page_view";
}

function normalizePath(path, fullUrl) {
  const rawPath = normalizeText(path, 1024);
  if (rawPath) {
    return rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  }

  const safeUrl = normalizeText(fullUrl, 2048);
  if (!safeUrl) {
    return "/";
  }

  try {
    const parsed = new URL(safeUrl);
    return parsed.pathname || "/";
  } catch {
    return "/";
  }
}

function getReferrerHost(referrer) {
  if (!referrer) {
    return "";
  }

  try {
    return new URL(referrer).hostname.replace(/^www\./i, "").slice(0, 255);
  } catch {
    return "";
  }
}

function getDeviceType(userAgent) {
  const ua = String(userAgent || "").toLowerCase();

  if (!ua) {
    return "unknown";
  }

  if (/tablet|ipad/.test(ua)) {
    return "tablet";
  }

  if (/mobi|android|iphone|ipod/.test(ua)) {
    return "mobile";
  }

  return "desktop";
}

function getBrowserName(userAgent) {
  const ua = String(userAgent || "");

  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua) && !/OPR\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/MSIE|Trident\//i.test(ua)) return "IE";

  return "Other";
}

function getOsName(userAgent) {
  const ua = String(userAgent || "");

  if (/Windows/i.test(ua)) return "Windows";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";

  return "Other";
}

analyticsRouter.post("/events", async (req, res) => {
  const payload = req.body && typeof req.body === "object" ? req.body : {};

  const eventType = normalizeEventType(payload.eventType);
  const fullUrl = normalizeText(payload.url, 2048);
  const referrer = normalizeText(payload.referrer, 2048);
  const referrerHost = getReferrerHost(referrer);
  const source = normalizeText(payload.source, 120) || (referrerHost || "directo");
  const medium = normalizeText(payload.medium, 120);
  const campaign = normalizeText(payload.campaign, 120);
  const term = normalizeText(payload.term, 120);
  const content = normalizeText(payload.content, 120);
  const userAgent = normalizeText(payload.userAgent || req.get("user-agent"), 1024);
  const deviceType = normalizeText(payload.deviceType, 48) || getDeviceType(userAgent);
  const browserName = normalizeText(payload.browserName, 80) || getBrowserName(userAgent);
  const osName = normalizeText(payload.osName, 80) || getOsName(userAgent);
  const language = normalizeText(payload.language, 32);
  const timezone = normalizeText(payload.timezone, 64);
  const visitorId = normalizeText(payload.visitorId, 120);
  const sessionId = normalizeText(payload.sessionId, 120);
  const path = normalizePath(payload.path, fullUrl);
  const screenWidth = normalizeInteger(payload.screenWidth);
  const screenHeight = normalizeInteger(payload.screenHeight);
  const viewportWidth = normalizeInteger(payload.viewportWidth);
  const viewportHeight = normalizeInteger(payload.viewportHeight);

  const occurredAtInput = normalizeText(payload.occurredAt, 60);
  const occurredAtDate = occurredAtInput ? new Date(occurredAtInput) : null;
  const occurredAt = occurredAtDate && !Number.isNaN(occurredAtDate.getTime()) ? occurredAtDate : new Date();

  const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};

  try {
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
        eventType,
        visitorId || null,
        sessionId || null,
        path,
        fullUrl || null,
        referrer || null,
        referrerHost || null,
        source || "directo",
        medium || null,
        campaign || null,
        term || null,
        content || null,
        deviceType || "unknown",
        browserName || "Other",
        osName || "Other",
        userAgent || null,
        language || null,
        screenWidth,
        screenHeight,
        viewportWidth,
        viewportHeight,
        timezone || null,
        JSON.stringify(metadata),
        occurredAt
      ]
    );

    return res.status(201).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "No se pudo registrar el evento" });
  }
});

export default analyticsRouter;
