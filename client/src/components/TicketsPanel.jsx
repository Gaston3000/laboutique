import { useEffect, useMemo, useRef, useState } from "react";

const PRIORITY_LABEL = {
  urgent: "Urgente",
  medium: "Media",
  low: "Baja"
};

const STATUS_LABEL = {
  not_started: "No empezado",
  in_progress: "En proceso",
  testing: "En validación",
  done: "Terminado"
};

const STATUS_FLOW_ORDER = ["not_started", "in_progress", "testing", "done"];

const TYPE_LABEL = {
  error: "Error / Problema",
  improvement: "Solicitud de mejora",
  product_request: "Alta de producto"
};

const CATEGORY_LABEL = {
  tecnico: "Técnico",
  visual: "Visual",
  contenido: "Contenido",
  productos: "Productos",
  rendimiento: "Rendimiento",
  otros: "Otros"
};

const CATEGORY_OPTIONS = ["tecnico", "visual", "contenido", "productos", "rendimiento", "otros"];

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getPriorityWeight(priority) {
  if (priority === "urgent") {
    return 0;
  }

  if (priority === "medium") {
    return 1;
  }

  return 2;
}

function getStatusWeight(status) {
  if (status === "not_started") {
    return 0;
  }

  if (status === "in_progress") {
    return 1;
  }

  if (status === "testing") {
    return 2;
  }

  return 3;
}

function getTicketDisplayId(ticket) {
  if (Number.isInteger(ticket?.id) && ticket.id > 0) {
    return ticket.id;
  }

  const numericPublicId = Number(ticket?.publicId);
  if (Number.isInteger(numericPublicId) && numericPublicId > 0) {
    return numericPublicId;
  }

  return ticket?.publicId || "-";
}

function humanizeHistoryAction(action) {
  const normalized = String(action || "").trim();
  if (!normalized) {
    return "Cambio registrado";
  }

  const text = normalized
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeHistoryValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, "value")) {
    return value.value;
  }

  return value;
}

function formatHistoryValueByAction(action, value) {
  const normalizedValue = normalizeHistoryValue(value);

  if (normalizedValue === null || normalizedValue === undefined || normalizedValue === "") {
    return "-";
  }

  if (action === "status_changed") {
    return STATUS_LABEL[normalizedValue] || String(normalizedValue);
  }

  if (action === "priority_changed") {
    return PRIORITY_LABEL[normalizedValue] || String(normalizedValue);
  }

  if (action === "type_changed") {
    return TYPE_LABEL[normalizedValue] || String(normalizedValue);
  }

  if (action === "category_changed") {
    return CATEGORY_LABEL[normalizedValue] || String(normalizedValue);
  }

  if (action === "progress_changed") {
    const numeric = Number(normalizedValue);
    return Number.isFinite(numeric) ? `${numeric}%` : String(normalizedValue);
  }

  if (action === "closed") {
    return normalizedValue ? "Cerrado" : "Abierto";
  }

  if (action === "duplicate_marked") {
    return normalizedValue ? `#${normalizedValue}` : "Sin duplicado";
  }

  return String(normalizedValue);
}

function describeHistoryEvent(event) {
  const action = String(event?.action || "");

  if (action === "created") {
    return {
      title: "Ticket creado",
      detail: "Se registró el ticket en el sistema."
    };
  }

  if (action === "comment_added") {
    return {
      title: "Comentario agregado",
      detail: "Se agregó un comentario al ticket."
    };
  }

  if (action === "closed") {
    const next = normalizeHistoryValue(event?.nextValue);
    return {
      title: next ? "Ticket cerrado" : "Ticket reabierto",
      detail: `${formatHistoryValueByAction(action, event?.previousValue)} → ${formatHistoryValueByAction(action, event?.nextValue)}`
    };
  }

  if (action === "status_changed") {
    return {
      title: "Estado actualizado",
      detail: `${formatHistoryValueByAction(action, event?.previousValue)} → ${formatHistoryValueByAction(action, event?.nextValue)}`
    };
  }

  if (action === "progress_changed") {
    return {
      title: "Progreso actualizado",
      detail: `${formatHistoryValueByAction(action, event?.previousValue)} → ${formatHistoryValueByAction(action, event?.nextValue)}`
    };
  }

  if (action === "priority_changed") {
    return {
      title: "Prioridad actualizada",
      detail: `${formatHistoryValueByAction(action, event?.previousValue)} → ${formatHistoryValueByAction(action, event?.nextValue)}`
    };
  }

  if (action === "type_changed") {
    return {
      title: "Tipo actualizado",
      detail: `${formatHistoryValueByAction(action, event?.previousValue)} → ${formatHistoryValueByAction(action, event?.nextValue)}`
    };
  }

  if (action === "category_changed") {
    return {
      title: "Categoría actualizada",
      detail: `${formatHistoryValueByAction(action, event?.previousValue)} → ${formatHistoryValueByAction(action, event?.nextValue)}`
    };
  }

  if (action === "duplicate_marked") {
    return {
      title: "Duplicado actualizado",
      detail: `${formatHistoryValueByAction(action, event?.previousValue)} → ${formatHistoryValueByAction(action, event?.nextValue)}`
    };
  }

  return {
    title: humanizeHistoryAction(action),
    detail: "Se registró un cambio en el ticket."
  };
}

export default function TicketsPanel({
  mode = "client",
  tickets = [],
  metrics = { open: 0, inProgress: 0, testing: 0, closed: 0 },
  currentUser,
  onCreateTicket,
  onUpdateTicket,
  onAddComment,
  onCloseTicket,
  onDeleteTicket,
  onReloadTickets,
  isLoading = false
}) {
  const isAdmin = mode === "admin";
  const [notice, setNotice] = useState("");
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    ticketType: "error",
    priority: "medium",
    category: "tecnico"
  });
  const [ticketFiles, setTicketFiles] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  const [selectedTicketRef, setSelectedTicketRef] = useState("");
  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.publicId === selectedTicketRef) || null,
    [tickets, selectedTicketRef]
  );

  const [updateForm, setUpdateForm] = useState({
    status: "not_started",
    progress: 0,
    priority: "medium",
    ticketType: "error",
    category: "tecnico",
    duplicateOfTicketRef: ""
  });

  const [commentBody, setCommentBody] = useState("");
  const [commentFiles, setCommentFiles] = useState([]);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [draggingTicketRef, setDraggingTicketRef] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState("");
  const dragPreviewRef = useRef(null);
  const transparentDragImageRef = useRef(null);

  function getTransparentDragImage() {
    if (transparentDragImageRef.current) {
      return transparentDragImageRef.current;
    }

    const pixel = document.createElement("canvas");
    pixel.width = 1;
    pixel.height = 1;
    transparentDragImageRef.current = pixel;

    return pixel;
  }

  function clearDragPreview() {
    if (!dragPreviewRef.current) {
      return;
    }

    dragPreviewRef.current.remove();
    dragPreviewRef.current = null;
  }

  function positionDragPreview(clientX, clientY) {
    if (!dragPreviewRef.current) {
      return;
    }

    if (clientX === 0 && clientY === 0) {
      return;
    }

    dragPreviewRef.current.style.transform = `translate3d(${clientX + 14}px, ${clientY + 14}px, 0)`;
  }

  function createDragPreview(sourceElement) {
    if (!(sourceElement instanceof HTMLElement)) {
      return;
    }

    clearDragPreview();

    const bounds = sourceElement.getBoundingClientRect();
    const preview = sourceElement.cloneNode(true);
    if (!(preview instanceof HTMLElement)) {
      return;
    }

    preview.classList.remove("is-dragging");
    preview.classList.remove("is-active");
    preview.classList.add("tickets-floating-drag-card");
    preview.style.width = `${bounds.width}px`;
    preview.style.position = "fixed";
    preview.style.left = "0";
    preview.style.top = "0";
    preview.style.margin = "0";
    preview.style.pointerEvents = "none";
    preview.style.zIndex = "9999";

    document.body.appendChild(preview);
    dragPreviewRef.current = preview;
  }

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (selectedTicketRef && !tickets.some((ticket) => ticket.publicId === selectedTicketRef)) {
      setSelectedTicketRef("");
    }
  }, [tickets, selectedTicketRef]);

  useEffect(() => {
    return () => {
      clearDragPreview();
    };
  }, []);

  useEffect(() => {
    if (!selectedTicket) {
      return;
    }

    setUpdateForm({
      status: selectedTicket.status || "not_started",
      progress: Number.isFinite(selectedTicket.progress) ? selectedTicket.progress : 0,
      priority: selectedTicket.priority || "medium",
      ticketType: selectedTicket.ticketType || "error",
      category: selectedTicket.category || "tecnico",
      duplicateOfTicketRef: ""
    });
  }, [selectedTicket]);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const statusDiff = getStatusWeight(a.status) - getStatusWeight(b.status);
      if (statusDiff !== 0) {
        return statusDiff;
      }

      const priorityDiff = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tickets]);

  const groupedTickets = useMemo(() => {
    const groups = {
      not_started: [],
      in_progress: [],
      testing: [],
      done: []
    };

    for (const ticket of sortedTickets) {
      const key = ticket.status || "not_started";
      if (!groups[key]) {
        groups.not_started.push(ticket);
        continue;
      }

      groups[key].push(ticket);
    }

    return groups;
  }, [sortedTickets]);

  async function handleCreateTicket(event) {
    event.preventDefault();

    if (!onCreateTicket) {
      return;
    }

    setIsCreating(true);

    try {
      const payload = {
        title: ticketForm.title,
        description: ticketForm.description,
        ticketType: ticketForm.ticketType,
        priority: ticketForm.priority,
        category: ticketForm.category,
        requesterName: currentUser?.name || "",
        requesterEmail: currentUser?.email || ""
      };

      const result = await onCreateTicket(payload, ticketFiles);
      const createdTicket = result?.item;

      setTicketForm({
        title: "",
        description: "",
        ticketType: "error",
        priority: "medium",
        category: "tecnico"
      });
      setTicketFiles([]);
      if (createdTicket?.publicId) {
        setSelectedTicketRef(createdTicket.publicId);
      }
      setIsCreateFormOpen(false);
      setNotice(result?.notification?.message || "Ticket creado correctamente");
    } catch (error) {
      setNotice(error.message || "No se pudo crear el ticket");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveTicketUpdates() {
    if (!selectedTicket || !onUpdateTicket || !isAdmin) {
      return;
    }

    setIsSavingTicket(true);

    try {
      const result = await onUpdateTicket(selectedTicket.publicId, {
        status: updateForm.status,
        progress: Number(updateForm.progress),
        priority: updateForm.priority,
        ticketType: updateForm.ticketType,
        category: updateForm.category,
        duplicateOfTicketRef: updateForm.duplicateOfTicketRef || undefined
      });

      setNotice(result?.notification?.message || "Ticket actualizado");
      setUpdateForm((current) => ({ ...current, duplicateOfTicketRef: "" }));
    } catch (error) {
      setNotice(error.message || "No se pudo actualizar el ticket");
    } finally {
      setIsSavingTicket(false);
    }
  }

  async function handleCloseTicket() {
    if (!selectedTicket || !onCloseTicket || !isAdmin) {
      return;
    }

    try {
      const result = await onCloseTicket(selectedTicket.publicId);
      setNotice(result?.notification?.message || "Ticket cerrado");
    } catch (error) {
      setNotice(error.message || "No se pudo cerrar el ticket");
    }
  }

  async function handleDeleteTicket() {
    if (!selectedTicket || !onDeleteTicket || !isAdmin) {
      return;
    }

    const confirmed = window.confirm(`¿Seguro que querés borrar el ticket #${getTicketDisplayId(selectedTicket)}?`);
    if (!confirmed) {
      return;
    }

    setIsDeletingTicket(true);

    try {
      const result = await onDeleteTicket(selectedTicket.publicId);
      setSelectedTicketRef("");
      setNotice(result?.notification?.message || "Ticket borrado");
    } catch (error) {
      setNotice(error.message || "No se pudo borrar el ticket");
    } finally {
      setIsDeletingTicket(false);
    }
  }

  async function handleAddComment(event) {
    event.preventDefault();

    if (!selectedTicket || !onAddComment || !commentBody.trim()) {
      return;
    }

    setIsCommenting(true);

    try {
      const result = await onAddComment(
        selectedTicket.publicId,
        { body: commentBody.trim() },
        commentFiles
      );
      setCommentBody("");
      setCommentFiles([]);
      setNotice(result?.notification?.message || "Comentario agregado");
    } catch (error) {
      setNotice(error.message || "No se pudo agregar el comentario");
    } finally {
      setIsCommenting(false);
    }
  }

  function resolveProgressForStatus(status, currentProgress) {
    const safeProgress = Number(currentProgress);

    if (status === "done") {
      return 100;
    }

    if (status === "not_started") {
      return 0;
    }

    if (status === "testing") {
      if (!Number.isFinite(safeProgress) || safeProgress <= 0 || safeProgress >= 100) {
        return 85;
      }

      return Math.min(99, Math.max(1, Math.round(safeProgress)));
    }

    if (!Number.isFinite(safeProgress) || safeProgress <= 0 || safeProgress >= 100) {
      return 50;
    }

    return Math.min(99, Math.max(1, Math.round(safeProgress)));
  }

  function handleDragStart(event, ticketRef) {
    if (!isAdmin || !onUpdateTicket) {
      return;
    }

    setDraggingTicketRef(ticketRef);
    createDragPreview(event.currentTarget);
    positionDragPreview(event.clientX, event.clientY);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", ticketRef);
    event.dataTransfer.setDragImage(getTransparentDragImage(), 0, 0);
  }

  function handleDrag(event) {
    positionDragPreview(event.clientX, event.clientY);
  }

  function handleDragEnd() {
    setDraggingTicketRef("");
    setDragOverStatus("");
    clearDragPreview();
  }

  function handleColumnDragOver(event, statusKey) {
    if (!isAdmin || !onUpdateTicket) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    positionDragPreview(event.clientX, event.clientY);

    if (dragOverStatus !== statusKey) {
      setDragOverStatus(statusKey);
    }
  }

  function handleColumnDragLeave(statusKey) {
    if (dragOverStatus === statusKey) {
      setDragOverStatus("");
    }
  }

  async function handleColumnDrop(event, targetStatus) {
    if (!isAdmin || !onUpdateTicket) {
      return;
    }

    event.preventDefault();

    const droppedRef = draggingTicketRef || event.dataTransfer.getData("text/plain");
    const ticket = tickets.find((item) => item.publicId === droppedRef);

    setDragOverStatus("");

    if (!ticket || ticket.status === targetStatus) {
      setDraggingTicketRef("");
      clearDragPreview();
      return;
    }

    try {
      const result = await onUpdateTicket(ticket.publicId, {
        status: targetStatus,
        progress: resolveProgressForStatus(targetStatus, ticket.progress)
      });
      setNotice(result?.notification?.message || `Ticket #${getTicketDisplayId(ticket)} movido a ${STATUS_LABEL[targetStatus]}`);
    } catch (error) {
      setNotice(error.message || "No se pudo mover el ticket");
    } finally {
      setDraggingTicketRef("");
      clearDragPreview();
    }
  }

  return (
    <section className="tickets-module" aria-label={isAdmin ? "Gestión de tickets" : "Mis tickets"}>
      <header className="tickets-header">
        <div>
          <h3>{isAdmin ? "Tablero de Tickets" : "Centro de Tickets"}</h3>
          <p>
            {isAdmin
              ? "Gestioná tickets por estado, prioridad y progreso."
              : "Creá tickets, seguí su avance y respondé comentarios."}
          </p>
        </div>
        <div className="tickets-header-actions">
          <button type="button" onClick={() => setIsCreateFormOpen((current) => !current)}>
            {isCreateFormOpen ? "Volver" : "Crear ticket"}
          </button>
          <button type="button" className="secondary-btn" onClick={onReloadTickets} disabled={isLoading}>
            Actualizar
          </button>
        </div>
      </header>

      {notice && <div className="tickets-notice">{notice}</div>}

      <div className="tickets-metrics" aria-label="Resumen de tickets">
        <article className="tickets-metric-card">
          <span>Abiertos</span>
          <strong>{metrics.open || 0}</strong>
        </article>
        <article className="tickets-metric-card">
          <span>En proceso</span>
          <strong>{metrics.inProgress || 0}</strong>
        </article>
        <article className="tickets-metric-card tickets-metric-card-testing">
          <span>En validación</span>
          <strong>{metrics.testing || 0}</strong>
        </article>
        <article className="tickets-metric-card">
          <span>Cerrados</span>
          <strong>{metrics.closed || 0}</strong>
        </article>
      </div>

      {isCreateFormOpen && (
        <form className="tickets-create-form" onSubmit={handleCreateTicket}>
          <h4>Crear ticket</h4>
          <div className="tickets-form-grid">
            <label>
              <span>Título</span>
              <input
                type="text"
                value={ticketForm.title}
                onChange={(event) => setTicketForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>Tipo</span>
              <select
                value={ticketForm.ticketType}
                onChange={(event) => setTicketForm((current) => ({ ...current, ticketType: event.target.value }))}
              >
                <option value="error">Error / Problema</option>
                <option value="improvement">Solicitud de mejora</option>
                <option value="product_request">Alta de producto</option>
              </select>
            </label>
            <label>
              <span>Prioridad</span>
              <select
                value={ticketForm.priority}
                onChange={(event) => setTicketForm((current) => ({ ...current, priority: event.target.value }))}
              >
                <option value="urgent">Urgente</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </label>
            <label>
              <span>Categoría</span>
              <select
                value={ticketForm.category}
                onChange={(event) => setTicketForm((current) => ({ ...current, category: event.target.value }))}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="tickets-description-field">
            <span>Descripción detallada</span>
            <textarea
              rows={4}
              value={ticketForm.description}
              onChange={(event) => setTicketForm((current) => ({ ...current, description: event.target.value }))}
              required
            />
          </label>

          <label className="tickets-file-field">
            <span>Adjuntar archivos (opcional)</span>
            <input
              type="file"
              multiple
              onChange={(event) => setTicketFiles(Array.from(event.target.files || []))}
            />
          </label>

          <div className="tickets-create-actions">
            <button type="button" className="secondary-btn" onClick={() => setIsCreateFormOpen(false)}>
              Cancelar
            </button>
            <button type="submit" disabled={isCreating}>{isCreating ? "Creando..." : "Crear ticket"}</button>
          </div>
        </form>
      )}

      {!selectedTicket ? (
        <section className="tickets-status-board" aria-label="Tickets por estado">
          {STATUS_FLOW_ORDER.map((statusKey) => (
            <article
              key={statusKey}
              className={`tickets-status-column ${dragOverStatus === statusKey ? "is-drag-over" : ""}`}
              onDragOver={(event) => handleColumnDragOver(event, statusKey)}
              onDragLeave={() => handleColumnDragLeave(statusKey)}
              onDrop={(event) => handleColumnDrop(event, statusKey)}
            >
              <header className="tickets-status-column-header">
                <h5>{STATUS_LABEL[statusKey]}</h5>
                <span>{groupedTickets[statusKey]?.length || 0}</span>
              </header>

              <div className="tickets-status-column-list">
                {(groupedTickets[statusKey] || []).length === 0 ? (
                  <p className="tickets-empty">Sin tickets</p>
                ) : (
                  (groupedTickets[statusKey] || []).map((ticket) => (
                    <button
                      key={ticket.publicId}
                      type="button"
                      className={`tickets-list-item ${isAdmin ? "is-draggable" : ""} ${draggingTicketRef === ticket.publicId ? "is-dragging" : ""}`}
                      onClick={() => setSelectedTicketRef(ticket.publicId)}
                      draggable={isAdmin}
                      onDragStart={(event) => handleDragStart(event, ticket.publicId)}
                      onDrag={handleDrag}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="tickets-list-header">
                        <strong>#{getTicketDisplayId(ticket)}</strong>
                        <span className={`priority-badge priority-${ticket.priority}`}>{PRIORITY_LABEL[ticket.priority] || ticket.priority}</span>
                      </div>
                      <h5>{ticket.title}</h5>
                      <p>{TYPE_LABEL[ticket.ticketType] || ticket.ticketType}</p>
                      <div className="tickets-list-meta">
                        <span>{STATUS_LABEL[ticket.status] || ticket.status}</span>
                        <span>{ticket.progress || 0}%</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </article>
          ))}
        </section>

      ) : (
        <section className="tickets-detail tickets-detail-screen" aria-label="Detalle del ticket">
          <div className="tickets-detail-screen-top">
            <button
              type="button"
              className="secondary-btn tickets-back-btn"
              onClick={() => setSelectedTicketRef("")}
            >
              Volver al tablero
            </button>
          </div>

          <>
              <header className="tickets-detail-header">
                <div>
                  <p>Ticket #{getTicketDisplayId(selectedTicket)}</p>
                  <h4>{selectedTicket.title}</h4>
                  <small>
                    Generado el {formatDate(selectedTicket.createdAt)}
                    {selectedTicket.requesterName ? ` por ${selectedTicket.requesterName}` : ""}
                  </small>
                </div>
                <div className="tickets-detail-tags">
                  <span className={`priority-badge priority-${selectedTicket.priority}`}>
                    {PRIORITY_LABEL[selectedTicket.priority] || selectedTicket.priority}
                  </span>
                  <span className="status-badge">{STATUS_LABEL[selectedTicket.status] || selectedTicket.status}</span>
                </div>
              </header>

              <p className="tickets-description">{selectedTicket.description}</p>

              <ul className="tickets-key-values">
                <li><span>Tipo</span><strong>{TYPE_LABEL[selectedTicket.ticketType] || selectedTicket.ticketType}</strong></li>
                <li><span>Categoría</span><strong>{selectedTicket.category || "-"}</strong></li>
                <li><span>Progreso</span><strong>{selectedTicket.progress || 0}%</strong></li>
                <li><span>Estado</span><strong>{STATUS_LABEL[selectedTicket.status] || selectedTicket.status}</strong></li>
                <li><span>Creado por</span><strong>{selectedTicket.requesterName || selectedTicket.requesterEmail || "Usuario"}</strong></li>
              </ul>

              {!!selectedTicket.attachments?.length && (
                <div className="tickets-attachments">
                  <h5>Adjuntos</h5>
                  <ul>
                    {selectedTicket.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        <a href={attachment.fileUrl} target="_blank" rel="noreferrer">{attachment.fileName}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isAdmin && (
                <div className="tickets-admin-controls">
                  <h5>Gestión admin</h5>
                  <div className="tickets-admin-grid">
                    <label>
                      <span>Estado</span>
                      <select
                        value={updateForm.status}
                        onChange={(event) => {
                          const nextStatus = event.target.value;
                          setUpdateForm((current) => ({
                            ...current,
                            status: nextStatus,
                            progress: resolveProgressForStatus(nextStatus, current.progress)
                          }));
                        }}
                      >
                        <option value="not_started">No empezado</option>
                        <option value="in_progress">En proceso</option>
                        <option value="testing">En validación</option>
                        <option value="done">Terminado</option>
                      </select>
                    </label>
                    <label>
                      <span>Progreso (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={updateForm.status === "not_started" ? 0 : updateForm.progress}
                        disabled={updateForm.status === "not_started"}
                        onChange={(event) => setUpdateForm((current) => ({ ...current, progress: event.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Prioridad</span>
                      <select value={updateForm.priority} onChange={(event) => setUpdateForm((current) => ({ ...current, priority: event.target.value }))}>
                        <option value="urgent">Urgente</option>
                        <option value="medium">Media</option>
                        <option value="low">Baja</option>
                      </select>
                    </label>
                    <label>
                      <span>Tipo</span>
                      <select value={updateForm.ticketType} onChange={(event) => setUpdateForm((current) => ({ ...current, ticketType: event.target.value }))}>
                        <option value="error">Error / Problema</option>
                        <option value="improvement">Solicitud de mejora</option>
                        <option value="product_request">Alta de producto</option>
                      </select>
                    </label>
                    <label>
                      <span>Categoría</span>
                      <select value={updateForm.category} onChange={(event) => setUpdateForm((current) => ({ ...current, category: event.target.value }))}>
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Marcar duplicado de</span>
                      <input
                        type="text"
                        placeholder="Ej: 1"
                        value={updateForm.duplicateOfTicketRef}
                        onChange={(event) => setUpdateForm((current) => ({ ...current, duplicateOfTicketRef: event.target.value }))}
                      />
                    </label>
                  </div>

                  <div className="tickets-admin-actions">
                    <button type="button" onClick={handleSaveTicketUpdates} disabled={isSavingTicket}>
                      {isSavingTicket ? "Guardando..." : "Guardar cambios"}
                    </button>
                    <button type="button" className="secondary-btn" onClick={handleCloseTicket}>
                      Cerrar ticket
                    </button>
                  </div>
                </div>
              )}

              <div className="tickets-comments">
                <h5>Comentarios</h5>
                {!selectedTicket.comments?.length ? (
                  <p className="tickets-empty">Todavía no hay comentarios.</p>
                ) : (
                  <ul>
                    {selectedTicket.comments.map((comment) => (
                      <li key={comment.id} className="ticket-comment-item">
                        <header>
                          <strong>{comment.authorName || "Usuario"}</strong>
                          <time>{formatDate(comment.createdAt)}</time>
                        </header>
                        <p>{comment.body}</p>
                      </li>
                    ))}
                  </ul>
                )}

                <form className="ticket-comment-form" onSubmit={handleAddComment}>
                  <textarea
                    rows={3}
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    placeholder="Escribí un comentario..."
                    required
                  />
                  <div className="ticket-comment-actions">
                    <input
                      type="file"
                      multiple
                      onChange={(event) => setCommentFiles(Array.from(event.target.files || []))}
                    />
                    <button type="submit" disabled={isCommenting}>{isCommenting ? "Enviando..." : "Comentar"}</button>
                  </div>
                </form>
              </div>

              <div className="tickets-history">
                <h5>Historial</h5>
                {!selectedTicket.history?.length ? (
                  <p className="tickets-empty">Sin cambios registrados.</p>
                ) : (
                  <ul>
                    {selectedTicket.history.map((event) => {
                      const summary = describeHistoryEvent(event);

                      return (
                        <li key={event.id} className="tickets-history-item">
                          <header>
                            <strong>{summary.title}</strong>
                            <time>{formatDate(event.createdAt)}</time>
                          </header>
                          <p>{summary.detail}</p>
                          <small>{event.actorName || "Sistema"}</small>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {isAdmin && onDeleteTicket && (
                <div className="tickets-delete-wrap">
                  <button type="button" className="danger-btn" onClick={handleDeleteTicket} disabled={isDeletingTicket}>
                    {isDeletingTicket ? "Borrando..." : "Borrar ticket"}
                  </button>
                </div>
              )}
          </>
        </section>
      )}
    </section>
  );
}
