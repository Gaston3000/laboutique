export default function WelcomePromoSpotlight({ onActivate }) {
  return (
    <section className="welcome-spotlight" aria-label="Promoción de bienvenida">
      <div className="welcome-spotlight-content">
        <p className="welcome-spotlight-eyebrow">Beneficio exclusivo de bienvenida</p>
        <h2>Llevate 10% OFF en tu primera compra registrándote hoy.</h2>
        <p className="welcome-spotlight-code-line">
          Este es tu código de descuento: <strong>PRIMERACOMPRA10</strong> · Ya está activo.
        </p>
        <p className="welcome-spotlight-terms">
          Aplicado a cada ítem del pedido (todos los productos), no combinable con otros descuentos,
          1 uso por cliente y no aplica al envío.
        </p>
      </div>

      <button
        type="button"
        className="welcome-spotlight-cta"
        onClick={onActivate}
      >
        <span>Activar 10% OFF</span>
        <span className="welcome-spotlight-cta-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <rect x="3.5" y="8" width="17" height="4" rx="1.4" ry="1.4" />
            <rect x="4.7" y="12" width="14.6" height="8.4" rx="1.8" ry="1.8" />
            <path d="M12 8v12.4" />
            <path d="M12 8c-1.9 0-3.3-1.2-3.3-2.7 0-1.2.8-2.1 1.9-2.1 1.4 0 2.2 1.2 3.4 3.4 1.2-2.2 2-3.4 3.4-3.4 1.1 0 1.9.9 1.9 2.1 0 1.5-1.4 2.7-3.3 2.7" />
          </svg>
        </span>
      </button>
    </section>
  );
}
