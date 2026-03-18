import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { query } from "../db.js";

const notificationsRouter = Router();

/**
 * GET /api/notifications
 * Returns admin notifications (newest first).
 * Query params: ?unread=true  — only unread
 *               ?limit=50     — max rows
 */
notificationsRouter.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const onlyUnread = req.query.unread === "true";
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

    const conditions = [];
    const params = [];

    if (onlyUnread) {
      conditions.push("n.is_read = FALSE");
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await query(
      `SELECT n.id, n.order_id, n.event_type, n.message, n.is_read, n.created_at,
              o.customer_name, o.total_ars, o.status AS order_status
       FROM order_notifications n
       LEFT JOIN orders o ON o.id = n.order_id
       ${where}
       ORDER BY n.created_at DESC
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    const unreadResult = await query(
      "SELECT COUNT(*)::int AS count FROM order_notifications WHERE is_read = FALSE"
    );

    return res.json({
      items: result.rows.map((r) => ({
        id: r.id,
        orderId: r.order_id,
        eventType: r.event_type,
        message: r.message,
        isRead: r.is_read,
        createdAt: r.created_at,
        customerName: r.customer_name,
        orderTotal: r.total_ars ? Number(r.total_ars) : null,
        orderStatus: r.order_status,
      })),
      unreadCount: unreadResult.rows[0]?.count || 0,
    });
  } catch {
    return res.status(500).json({ error: "No se pudieron obtener las notificaciones" });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
notificationsRouter.patch("/:id/read", requireAuth, requireAdmin, async (req, res) => {
  const notifId = Number(req.params.id);

  if (!Number.isInteger(notifId) || notifId <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    await query("UPDATE order_notifications SET is_read = TRUE WHERE id = $1", [notifId]);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "No se pudo marcar como leída" });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read.
 */
notificationsRouter.post("/read-all", requireAuth, requireAdmin, async (_req, res) => {
  try {
    await query("UPDATE order_notifications SET is_read = TRUE WHERE is_read = FALSE");
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "No se pudieron marcar como leídas" });
  }
});

export default notificationsRouter;
