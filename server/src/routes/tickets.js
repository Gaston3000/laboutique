import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { db, query } from "../db.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const ticketsRouter = Router();
const uploadsDir = path.resolve(process.cwd(), "uploads", "tickets");
const MAX_TICKET_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, callback) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      callback(null, uploadsDir);
    },
    filename(_req, file, callback) {
      const ext = path.extname(file.originalname || "").toLowerCase() || "";
      const safeExt = ext.slice(0, 10);
      callback(null, `${Date.now()}-${crypto.randomUUID()}${safeExt}`);
    }
  }),
  limits: {
    files: MAX_TICKET_FILES,
    fileSize: MAX_FILE_SIZE
  }
});

const ticketTypeAliases = {
  error: "error",
  problema: "error",
  issue: "error",
  "error-problema": "error",
  improvement: "improvement",
  mejora: "improvement",
  "solicitud-mejora": "improvement",
  "solicitud de mejora": "improvement",
  product_request: "product_request",
  "product-request": "product_request",
  "nuevo-producto": "product_request",
  "alta-producto": "product_request",
  "alta de producto": "product_request"
};

const priorityAliases = {
  urgent: "urgent",
  urgente: "urgent",
  medium: "medium",
  media: "medium",
  low: "low",
  baja: "low"
};

const categoryAliases = {
  tecnico: "tecnico",
  técnico: "tecnico",
  visual: "visual",
  contenido: "contenido",
  productos: "productos",
  producto: "productos",
  rendimiento: "rendimiento",
  performance: "rendimiento",
  otros: "otros",
  otro: "otros"
};

const statusAliases = {
  not_started: "not_started",
  "no empezado": "not_started",
  "no-empezado": "not_started",
  in_progress: "in_progress",
  "en proceso": "in_progress",
  "en-proceso": "in_progress",
  testing: "testing",
  "in_validation": "testing",
  "en_validacion": "testing",
  "en_validación": "testing",
  testeo: "testing",
  pruebas: "testing",
  validacion: "testing",
  validación: "testing",
  "en validacion": "testing",
  "en validación": "testing",
  "en-validacion": "testing",
  "en-validación": "testing",
  done: "done",
  terminado: "done"
};

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlug(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseEnum(value, aliases) {
  const normalized = normalizeSlug(value);
  return aliases[normalized] || null;
}

function parseTicketStatus(value) {
  const byAlias = parseEnum(value, statusAliases);
  if (byAlias) {
    return byAlias;
  }

  const normalizedRaw = normalizeSlug(value).replace(/[\s-]+/g, "_");

  if (normalizedRaw === "not_started" || normalizedRaw === "in_progress" || normalizedRaw === "testing" || normalizedRaw === "done") {
    return normalizedRaw;
  }

  return null;
}

function parseProgress(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const rounded = Math.round(parsed);
  if (rounded < 0 || rounded > 100) {
    return null;
  }

  return rounded;
}

function getAttachmentUrl(req, fileName) {
  return `${req.protocol}://${req.get("host")}/uploads/tickets/${fileName}`;
}

function mapTicket(row) {
  return {
    id: row.id,
    publicId: row.public_id,
    title: row.title,
    description: row.description,
    ticketType: row.ticket_type,
    priority: row.priority,
    category: row.category,
    status: row.status,
    progress: row.progress,
    requesterUserId: row.requester_user_id,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    isClosed: row.is_closed,
    closedAt: row.closed_at,
    duplicateOfTicketId: row.duplicate_of_ticket_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapComment(row) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorUserId: row.author_user_id,
    authorRole: row.author_role,
    authorName: row.author_name,
    body: row.body,
    visibility: row.visibility,
    createdAt: row.created_at
  };
}

function mapHistory(row) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    actorName: row.actor_name,
    action: row.action,
    previousValue: row.previous_value,
    nextValue: row.next_value,
    createdAt: row.created_at
  };
}

function mapAttachment(row) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    commentId: row.comment_id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    uploadedByUserId: row.uploaded_by_user_id,
    createdAt: row.created_at
  };
}

async function insertTicketHistoryEvent(dbClient, payload) {
  const {
    ticketId,
    actorUserId,
    actorRole,
    actorName,
    action,
    previousValue,
    nextValue
  } = payload;

  try {
    await dbClient.query(
      `INSERT INTO ticket_history (ticket_id, actor_user_id, actor_role, actor_name, action, previous_value, next_value)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
      [
        ticketId,
        actorUserId,
        actorRole,
        actorName,
        action,
        JSON.stringify({ value: previousValue }),
        JSON.stringify({ value: nextValue })
      ]
    );
    return;
  } catch (error) {
    if (error?.code !== "42703") {
      throw error;
    }
  }

  await dbClient.query(
    `INSERT INTO ticket_history (ticket_id, actor_user_id, actor_role, actor_name, action, next_value)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      ticketId,
      actorUserId,
      actorRole,
      actorName,
      action,
      JSON.stringify({ previous: previousValue, next: nextValue })
    ]
  );
}

function ensureTicketAccess(ticket, user) {
  if (!ticket || !user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  if (ticket.requester_user_id && ticket.requester_user_id === user.id) {
    return true;
  }

  if (ticket.requester_email && user.email) {
    return String(ticket.requester_email).toLowerCase() === String(user.email).toLowerCase();
  }

  return false;
}


async function loadTicketRelations(dbClient, ticketIds, role) {
  if (!Array.isArray(ticketIds) || !ticketIds.length) {
    return { commentsByTicket: new Map(), historyByTicket: new Map(), attachmentsByTicket: new Map() };
  }

  const commentsResult = await dbClient.query(
    `SELECT id, ticket_id, author_user_id, author_role, author_name, body, visibility, created_at
     FROM ticket_comments
     WHERE ticket_id = ANY($1::int[])
       AND ($2 = 'admin' OR visibility = 'public')
     ORDER BY created_at ASC, id ASC`,
    [ticketIds, role]
  );

  const historyResult = await dbClient.query(
    `SELECT id, ticket_id, actor_user_id, actor_role, actor_name, action, previous_value, next_value, created_at
     FROM ticket_history
     WHERE ticket_id = ANY($1::int[])
     ORDER BY created_at ASC, id ASC`,
    [ticketIds]
  );

  const attachmentResult = await dbClient.query(
    `SELECT id, ticket_id, comment_id, file_name, file_url, mime_type, file_size, uploaded_by_user_id, created_at
     FROM ticket_attachments
     WHERE ticket_id = ANY($1::int[])
     ORDER BY created_at ASC, id ASC`,
    [ticketIds]
  );

  const commentsByTicket = new Map();
  const historyByTicket = new Map();
  const attachmentsByTicket = new Map();

  for (const row of commentsResult.rows) {
    const item = mapComment(row);
    if (!commentsByTicket.has(item.ticketId)) {
      commentsByTicket.set(item.ticketId, []);
    }
    commentsByTicket.get(item.ticketId).push(item);
  }

  for (const row of historyResult.rows) {
    const item = mapHistory(row);
    if (role !== "admin" && item.action === "comment_added" && item.nextValue?.visibility === "internal") {
      continue;
    }
    if (!historyByTicket.has(item.ticketId)) {
      historyByTicket.set(item.ticketId, []);
    }
    historyByTicket.get(item.ticketId).push(item);
  }

  for (const row of attachmentResult.rows) {
    const item = mapAttachment(row);
    if (!attachmentsByTicket.has(item.ticketId)) {
      attachmentsByTicket.set(item.ticketId, []);
    }
    attachmentsByTicket.get(item.ticketId).push(item);
  }

  return { commentsByTicket, historyByTicket, attachmentsByTicket };
}

function parseTicketReference(reference) {
  const normalized = normalizeText(reference);
  if (!normalized) {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    return { field: "id", value: Number(normalized) };
  }

  return { field: "public_id", value: normalized.toUpperCase() };
}

async function resolveTicket(dbClient, reference) {
  const parsed = parseTicketReference(reference);

  if (!parsed) {
    return null;
  }

  const result = await dbClient.query(
    `SELECT id, public_id, title, description, ticket_type, priority, category, status, progress,
            requester_user_id, requester_name, requester_email, is_closed, closed_at,
            duplicate_of_ticket_id, created_at, updated_at
     FROM tickets
     WHERE ${parsed.field} = $1
     LIMIT 1`,
    [parsed.value]
  );

  return result.rows[0] || null;
}

function buildListSortClause(sortBy) {
  if (sortBy === "date_asc") {
    return "ORDER BY t.created_at ASC, t.id ASC";
  }

  if (sortBy === "date_desc") {
    return "ORDER BY t.created_at DESC, t.id DESC";
  }

  return `ORDER BY
    CASE t.priority WHEN 'urgent' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END ASC,
    CASE t.status WHEN 'not_started' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'testing' THEN 2 ELSE 3 END ASC,
    t.created_at DESC,
    t.id DESC`;
}

ticketsRouter.post("/public/legal-request", (req, res) => {
  upload.array("files", MAX_TICKET_FILES)(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ error: error.message || "No se pudieron subir archivos" });
    }

    const requestType = normalizeText(req.body?.requestType);
    const firstName = normalizeText(req.body?.firstName);
    const lastName = normalizeText(req.body?.lastName);
    const email = normalizeText(req.body?.email).toLowerCase();
    const phone = normalizeText(req.body?.phone);
    const orderNumber = normalizeText(req.body?.orderNumber);
    const reason = normalizeText(req.body?.reason);
    const message = normalizeText(req.body?.message);
    const requesterName = [firstName, lastName].filter(Boolean).join(" ").trim();

    if (!requestType || !firstName || !lastName || !email || !message) {
      return res.status(400).json({ error: "Completá nombre, apellido, email y mensaje" });
    }

    if (!email.includes("@")) {
      return res.status(400).json({ error: "Ingresá un email válido" });
    }

    if (requestType !== "complaints-book" && requestType !== "withdrawal-button") {
      return res.status(400).json({ error: "Tipo de solicitud inválido" });
    }

    if (requestType === "complaints-book" && !reason) {
      return res.status(400).json({ error: "Seleccioná el motivo del reclamo" });
    }

    if (requestType === "withdrawal-button" && (!phone || !orderNumber)) {
      return res.status(400).json({ error: "Teléfono y número de pedido son obligatorios" });
    }

    const normalizedReason = normalizeSlug(reason);
    const isSuggestion = normalizedReason === "sugerencia";
    const ticketType = requestType === "withdrawal-button"
      ? "error"
      : (isSuggestion ? "improvement" : "error");
    const priority = requestType === "withdrawal-button"
      ? "urgent"
      : (isSuggestion ? "low" : "medium");
    const category = "otros";
    const title = requestType === "withdrawal-button"
      ? `Botón de arrepentimiento - Pedido ${orderNumber}`
      : `Libro de quejas - ${reason}`;

    const descriptionLines = [
      requestType === "withdrawal-button" ? "Solicitud enviada desde Botón de Arrepentimiento" : "Solicitud enviada desde Libro de Quejas Online",
      `Nombre: ${requesterName}`,
      `Email: ${email}`,
      phone ? `Teléfono: ${phone}` : "",
      orderNumber ? `Número de pedido: ${orderNumber}` : "",
      reason ? `Motivo: ${reason}` : "",
      "Mensaje:",
      message
    ].filter(Boolean);

    const description = descriptionLines.join("\n").trim();

    const dbClient = await db.connect();

    try {
      await dbClient.query("BEGIN");

      const ticketInsert = await dbClient.query(
        `WITH next_ticket AS (
          SELECT nextval(pg_get_serial_sequence('tickets', 'id')) AS id
        )
        INSERT INTO tickets (
          id, public_id, title, description, ticket_type, priority, category,
          requester_user_id, requester_name, requester_email
        )
        SELECT
          next_ticket.id,
          next_ticket.id::text,
          $1, $2, $3, $4, $5, $6, $7, $8
        FROM next_ticket
        RETURNING id, public_id, title, description, ticket_type, priority, category, status, progress,
                  requester_user_id, requester_name, requester_email, is_closed, closed_at,
                  duplicate_of_ticket_id, created_at, updated_at`,
        [
          title,
          description,
          ticketType,
          priority,
          category,
          null,
          requesterName || null,
          email || null
        ]
      );

      const createdTicket = ticketInsert.rows[0];
      const files = Array.isArray(req.files) ? req.files : [];

      for (const file of files) {
        await dbClient.query(
          `INSERT INTO ticket_attachments (ticket_id, file_name, file_url, mime_type, file_size, uploaded_by_user_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            createdTicket.id,
            file.originalname || file.filename,
            getAttachmentUrl(req, file.filename),
            file.mimetype || null,
            Number(file.size) || 0,
            null
          ]
        );
      }

      await dbClient.query(
        `INSERT INTO ticket_history (ticket_id, actor_user_id, actor_role, actor_name, action, next_value)
         VALUES ($1, $2, $3, $4, 'created', $5::jsonb)`,
        [
          createdTicket.id,
          null,
          "public",
          requesterName || null,
          JSON.stringify({
            status: createdTicket.status,
            progress: createdTicket.progress,
            priority: createdTicket.priority,
            ticketType: createdTicket.ticket_type,
            source: requestType
          })
        ]
      );

      await dbClient.query("COMMIT");

      const { attachmentsByTicket, commentsByTicket, historyByTicket } = await loadTicketRelations(dbClient, [createdTicket.id], "client");
      return res.status(201).json({
        item: {
          ...mapTicket(createdTicket),
          attachments: attachmentsByTicket.get(createdTicket.id) || [],
          comments: commentsByTicket.get(createdTicket.id) || [],
          history: historyByTicket.get(createdTicket.id) || []
        },
        notification: {
          type: "ticket_created",
          message: `Solicitud registrada. Ticket #${createdTicket.id}`
        }
      });
    } catch {
      await dbClient.query("ROLLBACK");
      return res.status(500).json({ error: "No se pudo registrar la solicitud" });
    } finally {
      dbClient.release();
    }
  });
});

ticketsRouter.post("/", requireAuth, (req, res) => {
  upload.array("files", MAX_TICKET_FILES)(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ error: error.message || "No se pudieron subir archivos" });
    }

    const title = normalizeText(req.body?.title);
    const description = normalizeText(req.body?.description);
    const ticketType = parseEnum(req.body?.ticketType, ticketTypeAliases);
    const priority = parseEnum(req.body?.priority, priorityAliases);
    const category = req.body?.category ? parseEnum(req.body?.category, categoryAliases) : null;
    const requesterName = normalizeText(req.user?.name);
    const requesterEmail = normalizeText(req.user?.email).toLowerCase();

    if (!title || !description || !ticketType || !priority) {
      return res.status(400).json({ error: "Título, descripción, tipo y prioridad son obligatorios" });
    }

    const dbClient = await db.connect();

    try {
      await dbClient.query("BEGIN");

      const ticketInsert = await dbClient.query(
        `WITH next_ticket AS (
          SELECT nextval(pg_get_serial_sequence('tickets', 'id')) AS id
        )
        INSERT INTO tickets (
          id, public_id, title, description, ticket_type, priority, category,
          requester_user_id, requester_name, requester_email
        )
        SELECT
          next_ticket.id,
          next_ticket.id::text,
          $1, $2, $3, $4, $5, $6, $7, $8
        FROM next_ticket
        RETURNING id, public_id, title, description, ticket_type, priority, category, status, progress,
                  requester_user_id, requester_name, requester_email, is_closed, closed_at,
                  duplicate_of_ticket_id, created_at, updated_at`,
        [
          title,
          description,
          ticketType,
          priority,
          category,
          req.user?.id || null,
          requesterName || null,
          requesterEmail || null
        ]
      );

      const createdTicket = ticketInsert.rows[0];
      const files = Array.isArray(req.files) ? req.files : [];

      for (const file of files) {
        await dbClient.query(
          `INSERT INTO ticket_attachments (ticket_id, file_name, file_url, mime_type, file_size, uploaded_by_user_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            createdTicket.id,
            file.originalname || file.filename,
            getAttachmentUrl(req, file.filename),
            file.mimetype || null,
            Number(file.size) || 0,
            req.user?.id || null
          ]
        );
      }

      await dbClient.query(
        `INSERT INTO ticket_history (ticket_id, actor_user_id, actor_role, actor_name, action, next_value)
         VALUES ($1, $2, $3, $4, 'created', $5::jsonb)`,
        [
          createdTicket.id,
          req.user?.id || null,
          req.user?.role || null,
          req.user?.name || null,
          JSON.stringify({
            status: createdTicket.status,
            progress: createdTicket.progress,
            priority: createdTicket.priority,
            ticketType: createdTicket.ticket_type
          })
        ]
      );

      await dbClient.query("COMMIT");

      const { attachmentsByTicket, commentsByTicket, historyByTicket } = await loadTicketRelations(dbClient, [createdTicket.id], req.user.role);
      return res.status(201).json({
        item: {
          ...mapTicket(createdTicket),
          attachments: attachmentsByTicket.get(createdTicket.id) || [],
          comments: commentsByTicket.get(createdTicket.id) || [],
          history: historyByTicket.get(createdTicket.id) || []
        },
        notification: {
          type: "ticket_created",
          message: `Ticket #${createdTicket.id} creado`
        }
      });
    } catch {
      await dbClient.query("ROLLBACK");
      return res.status(500).json({ error: "No se pudo crear el ticket" });
    } finally {
      dbClient.release();
    }
  });
});

ticketsRouter.get("/", requireAuth, async (req, res) => {
  const role = req.user?.role;
  const isAdmin = role === "admin";
  const mine = String(req.query?.mine || "").toLowerCase() === "true";
  const q = normalizeText(req.query?.q);
  const status = req.query?.status ? parseTicketStatus(req.query.status) : null;
  const priority = req.query?.priority ? parseEnum(req.query.priority, priorityAliases) : null;
  const ticketType = req.query?.ticketType ? parseEnum(req.query.ticketType, ticketTypeAliases) : null;
  const fromDate = normalizeText(req.query?.fromDate);
  const toDate = normalizeText(req.query?.toDate);
  const sortBy = normalizeText(req.query?.sortBy);

  if (req.query?.status && !status) {
    return res.status(400).json({ error: "Filtro de estado inválido" });
  }

  if (req.query?.priority && !priority) {
    return res.status(400).json({ error: "Filtro de prioridad inválido" });
  }

  if (req.query?.ticketType && !ticketType) {
    return res.status(400).json({ error: "Filtro de tipo inválido" });
  }

  const conditions = [];
  const params = [];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (!isAdmin || mine) {
    const userIdParam = addParam(req.user?.id || 0);
    const emailParam = addParam(req.user?.email || "");
    conditions.push(`(t.requester_user_id = ${userIdParam} OR LOWER(COALESCE(t.requester_email, '')) = LOWER(${emailParam}))`);
  }

  if (status) {
    const statusParam = addParam(status);
    conditions.push(`t.status = ${statusParam}`);
  }

  if (priority) {
    const priorityParam = addParam(priority);
    conditions.push(`t.priority = ${priorityParam}`);
  }

  if (ticketType) {
    const typeParam = addParam(ticketType);
    conditions.push(`t.ticket_type = ${typeParam}`);
  }

  if (fromDate) {
    const fromParam = addParam(fromDate);
    conditions.push(`t.created_at >= ${fromParam}::timestamp`);
  }

  if (toDate) {
    const toParam = addParam(toDate);
    conditions.push(`t.created_at <= ${toParam}::timestamp + INTERVAL '1 day'`);
  }

  if (q) {
    const idLikeParam = addParam(`%${q}%`);
    const titleLikeParam = addParam(`%${q}%`);
    conditions.push(`(UPPER(t.public_id) LIKE UPPER(${idLikeParam}) OR t.title ILIKE ${titleLikeParam})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await query(
      `SELECT t.id, t.public_id, t.title, t.description, t.ticket_type, t.priority, t.category,
              t.status, t.progress, t.requester_user_id, t.requester_name, t.requester_email,
              t.is_closed, t.closed_at, t.duplicate_of_ticket_id, t.created_at, t.updated_at
       FROM tickets t
       ${whereClause}
       ${buildListSortClause(sortBy)}`,
      params
    );

    const items = result.rows.map(mapTicket);
    const ids = items.map((item) => item.id);
    const dbClient = await db.connect();

    try {
      const relations = await loadTicketRelations(dbClient, ids, role);

      return res.json({
        items: items.map((item) => ({
          ...item,
          attachments: relations.attachmentsByTicket.get(item.id) || [],
          comments: relations.commentsByTicket.get(item.id) || [],
          history: relations.historyByTicket.get(item.id) || []
        }))
      });
    } finally {
      dbClient.release();
    }
  } catch {
    return res.status(500).json({ error: "No se pudieron cargar tickets" });
  }
});

ticketsRouter.get("/metrics", requireAuth, async (req, res) => {
  const isAdmin = req.user?.role === "admin";

  try {
    let result;

    if (isAdmin) {
      result = await query(
        `SELECT
          COUNT(*) FILTER (WHERE is_closed = FALSE AND status = 'not_started') AS open_count,
          COUNT(*) FILTER (WHERE is_closed = FALSE AND status = 'in_progress') AS in_progress_count,
          COUNT(*) FILTER (WHERE is_closed = FALSE AND status = 'testing') AS testing_count,
          COUNT(*) FILTER (WHERE is_closed = TRUE OR status = 'done') AS closed_count
         FROM tickets`
      );
    } else {
      result = await query(
        `SELECT
          COUNT(*) FILTER (WHERE is_closed = FALSE AND status = 'not_started') AS open_count,
          COUNT(*) FILTER (WHERE is_closed = FALSE AND status = 'in_progress') AS in_progress_count,
          COUNT(*) FILTER (WHERE is_closed = FALSE AND status = 'testing') AS testing_count,
          COUNT(*) FILTER (WHERE is_closed = TRUE OR status = 'done') AS closed_count
         FROM tickets
         WHERE requester_user_id = $1 OR LOWER(COALESCE(requester_email, '')) = LOWER($2)`,
        [req.user?.id || 0, req.user?.email || ""]
      );
    }

    const row = result.rows[0] || {};

    return res.json({
      open: Number(row.open_count || 0),
      inProgress: Number(row.in_progress_count || 0),
      testing: Number(row.testing_count || 0),
      closed: Number(row.closed_count || 0)
    });
  } catch {
    return res.status(500).json({ error: "No se pudieron obtener métricas" });
  }
});

ticketsRouter.get("/:ticketRef", requireAuth, async (req, res) => {
  const dbClient = await db.connect();

  try {
    const row = await resolveTicket(dbClient, req.params.ticketRef);

    if (!row) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    if (!ensureTicketAccess(row, req.user)) {
      return res.status(403).json({ error: "No autorizado para ver este ticket" });
    }

    const relations = await loadTicketRelations(dbClient, [row.id], req.user.role);

    return res.json({
      item: {
        ...mapTicket(row),
        attachments: relations.attachmentsByTicket.get(row.id) || [],
        comments: relations.commentsByTicket.get(row.id) || [],
        history: relations.historyByTicket.get(row.id) || []
      }
    });
  } catch {
    return res.status(500).json({ error: "No se pudo cargar el ticket" });
  } finally {
    dbClient.release();
  }
});

ticketsRouter.patch("/:ticketRef", requireAuth, requireAdmin, async (req, res) => {
  const dbClient = await db.connect();

  try {
    await dbClient.query("BEGIN");
    const row = await resolveTicket(dbClient, req.params.ticketRef);

    if (!row) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    const nextStatus = req.body?.status ? parseTicketStatus(req.body.status) : null;
    const nextPriority = req.body?.priority ? parseEnum(req.body.priority, priorityAliases) : null;
    const nextType = req.body?.ticketType ? parseEnum(req.body.ticketType, ticketTypeAliases) : null;
    const nextCategory = req.body?.category === null || req.body?.category === "" ? null : (req.body?.category ? parseEnum(req.body.category, categoryAliases) : undefined);
    const nextProgress = req.body?.progress === undefined ? undefined : parseProgress(req.body.progress);
    const markClosed = req.body?.close === true;
    const duplicateRef = req.body?.duplicateOfTicketRef;

    if (req.body?.status && !nextStatus) {
      await dbClient.query("ROLLBACK");
      return res.status(400).json({
        error: "Estado inválido",
        received: req.body?.status,
        allowed: ["not_started", "in_progress", "testing", "done"]
      });
    }

    if (req.body?.priority && !nextPriority) {
      await dbClient.query("ROLLBACK");
      return res.status(400).json({ error: "Prioridad inválida" });
    }

    if (req.body?.ticketType && !nextType) {
      await dbClient.query("ROLLBACK");
      return res.status(400).json({ error: "Tipo inválido" });
    }

    if (req.body?.category && !nextCategory) {
      await dbClient.query("ROLLBACK");
      return res.status(400).json({ error: "Categoría inválida" });
    }

    if (req.body?.progress !== undefined && nextProgress === null) {
      await dbClient.query("ROLLBACK");
      return res.status(400).json({ error: "Progreso inválido" });
    }

    let duplicateOfTicketId = row.duplicate_of_ticket_id;

    if (duplicateRef !== undefined) {
      if (!duplicateRef) {
        duplicateOfTicketId = null;
      } else {
        const duplicateTicket = await resolveTicket(dbClient, duplicateRef);
        if (!duplicateTicket || duplicateTicket.id === row.id) {
          await dbClient.query("ROLLBACK");
          return res.status(400).json({ error: "Ticket duplicado inválido" });
        }
        duplicateOfTicketId = duplicateTicket.id;
      }
    }

    const updated = {
      status: nextStatus ?? row.status,
      priority: nextPriority ?? row.priority,
      ticketType: nextType ?? row.ticket_type,
      category: nextCategory === undefined ? row.category : nextCategory,
      progress: nextProgress === undefined ? row.progress : nextProgress,
      isClosed: markClosed ? true : row.is_closed,
      closedAt: markClosed ? new Date().toISOString() : row.closed_at,
      duplicateOfTicketId
    };

    if (updated.status === "done" && updated.progress < 100) {
      updated.progress = 100;
    }

    if (updated.status === "not_started") {
      updated.progress = 0;
    }

    if (updated.progress === 100 && updated.status !== "done") {
      updated.status = "done";
    }

    const updateResult = await dbClient.query(
      `UPDATE tickets
       SET status = $1,
           priority = $2,
           ticket_type = $3,
           category = $4,
           progress = $5,
           is_closed = $6,
           closed_at = $7,
           duplicate_of_ticket_id = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING id, public_id, title, description, ticket_type, priority, category,
                 status, progress, requester_user_id, requester_name, requester_email,
                 is_closed, closed_at, duplicate_of_ticket_id, created_at, updated_at`,
      [
        updated.status,
        updated.priority,
        updated.ticketType,
        updated.category,
        updated.progress,
        updated.isClosed,
        updated.closedAt,
        updated.duplicateOfTicketId,
        row.id
      ]
    );

    const current = updateResult.rows[0];
    const before = mapTicket(row);
    const after = mapTicket(current);

    const historyEvents = [
      ["status_changed", before.status, after.status],
      ["progress_changed", before.progress, after.progress],
      ["priority_changed", before.priority, after.priority],
      ["type_changed", before.ticketType, after.ticketType],
      ["category_changed", before.category, after.category],
      ["duplicate_marked", before.duplicateOfTicketId, after.duplicateOfTicketId],
      ["closed", before.isClosed, after.isClosed]
    ].filter((event) => event[1] !== event[2]);

    for (const [action, previousValue, nextValue] of historyEvents) {
      await insertTicketHistoryEvent(dbClient, {
        ticketId: row.id,
        actorUserId: req.user?.id || null,
        actorRole: req.user?.role || null,
        actorName: req.user?.name || null,
        action,
        previousValue,
        nextValue
      });
    }

    await dbClient.query("COMMIT");

    const relations = await loadTicketRelations(dbClient, [row.id], req.user.role);

    return res.json({
      item: {
        ...after,
        attachments: relations.attachmentsByTicket.get(row.id) || [],
        comments: relations.commentsByTicket.get(row.id) || [],
        history: relations.historyByTicket.get(row.id) || []
      },
      notification: {
        type: "ticket_updated",
        message: `Ticket #${after.id} actualizado`
      }
    });
  } catch (error) {
    await dbClient.query("ROLLBACK");
    console.error("PATCH /api/tickets/:ticketRef error", {
      ticketRef: req.params.ticketRef,
      code: error?.code,
      message: error?.message,
      detail: error?.detail,
      constraint: error?.constraint
    });

    const debugDetail = process.env.NODE_ENV === "production"
      ? undefined
      : (error?.detail || error?.message || null);

    return res.status(500).json({
      error: "No se pudo actualizar el ticket",
      detail: debugDetail
    });
  } finally {
    dbClient.release();
  }
});

ticketsRouter.post("/:ticketRef/comments", requireAuth, (req, res) => {
  upload.array("files", MAX_TICKET_FILES)(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ error: error.message || "No se pudieron subir archivos" });
    }

    const body = normalizeText(req.body?.body);
    const visibility = "public";

    if (!body) {
      return res.status(400).json({ error: "El comentario no puede estar vacío" });
    }

    const dbClient = await db.connect();

    try {
      await dbClient.query("BEGIN");
      const ticketRow = await resolveTicket(dbClient, req.params.ticketRef);

      if (!ticketRow) {
        await dbClient.query("ROLLBACK");
        return res.status(404).json({ error: "Ticket no encontrado" });
      }

      if (!ensureTicketAccess(ticketRow, req.user)) {
        await dbClient.query("ROLLBACK");
        return res.status(403).json({ error: "No autorizado para comentar" });
      }

      const commentResult = await dbClient.query(
        `INSERT INTO ticket_comments (ticket_id, author_user_id, author_role, author_name, body, visibility)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, ticket_id, author_user_id, author_role, author_name, body, visibility, created_at`,
        [
          ticketRow.id,
          req.user?.id || null,
          req.user?.role || "client",
          req.user?.name || null,
          body,
          visibility
        ]
      );

      const comment = commentResult.rows[0];
      const files = Array.isArray(req.files) ? req.files : [];

      for (const file of files) {
        await dbClient.query(
          `INSERT INTO ticket_attachments (ticket_id, comment_id, file_name, file_url, mime_type, file_size, uploaded_by_user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            ticketRow.id,
            comment.id,
            file.originalname || file.filename,
            getAttachmentUrl(req, file.filename),
            file.mimetype || null,
            Number(file.size) || 0,
            req.user?.id || null
          ]
        );
      }

      await dbClient.query(
        `INSERT INTO ticket_history (ticket_id, actor_user_id, actor_role, actor_name, action, next_value)
         VALUES ($1, $2, $3, $4, 'comment_added', $5::jsonb)`,
        [
          ticketRow.id,
          req.user?.id || null,
          req.user?.role || null,
          req.user?.name || null,
          JSON.stringify({ commentId: comment.id, visibility })
        ]
      );

      await dbClient.query("UPDATE tickets SET updated_at = NOW() WHERE id = $1", [ticketRow.id]);
      await dbClient.query("COMMIT");

      const relations = await loadTicketRelations(dbClient, [ticketRow.id], req.user.role);
      const currentTicket = await resolveTicket(dbClient, String(ticketRow.id));

      return res.status(201).json({
        item: {
          ...mapTicket(currentTicket),
          attachments: relations.attachmentsByTicket.get(ticketRow.id) || [],
          comments: relations.commentsByTicket.get(ticketRow.id) || [],
          history: relations.historyByTicket.get(ticketRow.id) || []
        },
        notification: {
          type: "comment_added",
          message: `Nuevo comentario en ${ticketRow.public_id}`
        }
      });
    } catch {
      await dbClient.query("ROLLBACK");
      return res.status(500).json({ error: "No se pudo guardar el comentario" });
    } finally {
      dbClient.release();
    }
  });
});

ticketsRouter.post("/:ticketRef/close", requireAuth, requireAdmin, async (req, res) => {
  try {
    const update = await query(
      `UPDATE tickets
       SET status = 'done', progress = 100, is_closed = TRUE, closed_at = NOW(), updated_at = NOW()
       WHERE id = (SELECT id FROM tickets WHERE id::text = $1 OR public_id = $1 LIMIT 1)
       RETURNING id, public_id`,
      [normalizeText(req.params.ticketRef)]
    );

    const row = update.rows[0];

    if (!row) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    await query(
      `INSERT INTO ticket_history (ticket_id, actor_user_id, actor_role, actor_name, action, next_value)
       VALUES ($1, $2, $3, $4, 'closed', $5::jsonb)`,
      [
        row.id,
        req.user?.id || null,
        req.user?.role || null,
        req.user?.name || null,
        JSON.stringify({ closed: true })
      ]
    );

    return res.json({
      success: true,
      notification: {
        type: "ticket_closed",
        message: `Ticket ${row.public_id} cerrado`
      }
    });
  } catch {
    return res.status(500).json({ error: "No se pudo cerrar el ticket" });
  }
});

ticketsRouter.delete("/:ticketRef", requireAuth, requireAdmin, async (req, res) => {
  const dbClient = await db.connect();

  try {
    await dbClient.query("BEGIN");
    const ticketRow = await resolveTicket(dbClient, req.params.ticketRef);

    if (!ticketRow) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    const deletedResult = await dbClient.query(
      `DELETE FROM tickets
       WHERE id = $1
       RETURNING id, public_id`,
      [ticketRow.id]
    );

    const deleted = deletedResult.rows[0];

    await dbClient.query("COMMIT");

    return res.json({
      success: true,
      deletedId: deleted?.id,
      deletedPublicId: deleted?.public_id,
      notification: {
        type: "ticket_deleted",
        message: `Ticket #${deleted?.id || ticketRow.id} borrado`
      }
    });
  } catch {
    await dbClient.query("ROLLBACK");
    return res.status(500).json({ error: "No se pudo borrar el ticket" });
  } finally {
    dbClient.release();
  }
});

export default ticketsRouter;
