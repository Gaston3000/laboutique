import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function PurchaseSuccessModal({ isOpen, orderId, total, onClose }) {
  const [animStage, setAnimStage] = useState("hidden");

  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimStage("visible"));
      });
      return () => cancelAnimationFrame(id);
    }
    setAnimStage("hidden");
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`psm-overlay ${animStage === "visible" ? "psm-overlay--visible" : ""}`}
      onClick={onClose}
    >
      <div
        className={`psm-card ${animStage === "visible" ? "psm-card--visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti sparkles */}
        <div className="psm-confetti" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="psm-confetti-piece" style={{ "--i": i }} />
          ))}
        </div>

        {/* Company logo */}
        <div className="psm-logo-wrap">
          <img
            src="/fotos/logo/La boutique de la limpiezalogo.webp"
            alt="La Boutique de la Limpieza"
            className="psm-logo"
          />
        </div>

        {/* Animated check icon */}
        <div className="psm-check-wrap">
          <svg className="psm-check-svg" viewBox="0 0 80 80" fill="none">
            <circle className="psm-check-circle" cx="40" cy="40" r="36" stroke="#22c55e" strokeWidth="4" />
            <path className="psm-check-tick" d="M24 42l10 10 22-24" stroke="#22c55e" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="psm-title">¡Gracias por tu compra!</h2>

        {orderId && (
          <p className="psm-order-id">Pedido <strong>#{orderId}</strong></p>
        )}

        {total != null && (
          <div className="psm-total">
            <span className="psm-total-label">Total pagado</span>
            <span className="psm-total-amount">${Number(total).toLocaleString("es-AR")},00 ARS</span>
          </div>
        )}

        <p className="psm-body">
          Nos estaremos comunicando con vos por <strong>e-mail</strong> para
          coordinar los detalles de tu pedido. Revisá tu bandeja de entrada y
          spam por las dudas.
        </p>

        <div className="psm-divider" />

        <button className="psm-btn" onClick={onClose}>
          <span>Seguir navegando</span>
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
            <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <p className="psm-footer">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
            <path d="M2.5 10a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0z" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M10 6v4l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Tu pedido ya fue registrado correctamente
        </p>
      </div>
    </div>,
    document.body
  );
}
