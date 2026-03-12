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
        <span className="welcome-spotlight-cta-icon" aria-hidden="true">
          <span className="welcome-spotlight-cta-icon-img welcome-spotlight-cta-icon-img-closed" />
          <span className="welcome-spotlight-cta-icon-img welcome-spotlight-cta-icon-img-open" />
        </span>
        <span>Activar 10% OFF</span>
      </button>
    </section>
  );
}
