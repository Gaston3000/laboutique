import { useState } from "react";

export default function WelcomePromoSpotlight({ onActivate, isActive = false }) {
  const [showToast, setShowToast] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  async function handleClick() {
    if (isActive || isActivating) return;
    setIsActivating(true);
    try {
      await onActivate();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } finally {
      setIsActivating(false);
    }
  }

  return (
    <section className="welcome-spotlight" aria-label="Promoción de bienvenida">
      {showToast && (
        <div className="welcome-spotlight-toast" role="status">
          <span className="welcome-spotlight-toast-icon">✅</span>
          ¡Descuento activado! Tenés 24hs para usarlo.
        </div>
      )}

      <div className="welcome-spotlight-content">
        <p className="welcome-spotlight-eyebrow">Beneficio exclusivo de bienvenida</p>
        <h2>Llevate 10% OFF en tu primera compra registrándote hoy.</h2>
        <p className="welcome-spotlight-code-line">
          Código de descuento: <strong>PRIMERACOMPRA10</strong>
          {isActive
            ? " · ✅ Activado — se aplica automáticamente."
            : " · Activalo cuando estés listo para comprar."}
        </p>
        <p className="welcome-spotlight-terms">
          Aplicado a cada ítem del pedido (todos los productos), no combinable con otros descuentos,
          1 uso por cliente y no aplica al envío.
        </p>
      </div>

      <button
        type="button"
        className={`welcome-spotlight-cta${isActive ? " is-activated" : ""}`}
        onClick={handleClick}
        disabled={isActive || isActivating}
      >
        <span className="welcome-spotlight-cta-icon" aria-hidden="true">
          {isActive ? (
            <svg viewBox="0 0 24 24" style={{width:'20px',height:'20px',display:'block'}}>
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          ) : (
            <>
              <span className="welcome-spotlight-cta-icon-img welcome-spotlight-cta-icon-img-closed" />
              <span className="welcome-spotlight-cta-icon-img welcome-spotlight-cta-icon-img-open" />
            </>
          )}
        </span>
        <span>{isActive ? "10% OFF Activado" : isActivating ? "Activando..." : "Activar 10% OFF"}</span>
      </button>
    </section>
  );
}
