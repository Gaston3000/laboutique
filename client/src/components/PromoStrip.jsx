export default function PromoStrip() {
  return (
    <section className="promo-strip" aria-label="Promociones de envío">
      <div className="promo-strip-marquee" role="presentation">
        <div className="promo-strip-track">
          <span className="promo-truck" aria-hidden="true">
            <span className="promo-truck-icon" />
          </span>
          <span className="promo-text">ENVIOS GRATIS DESDE $50.000 ARS</span>
          <span className="promo-separator">|</span>
          <span className="promo-text">ENVIOS EXCLUSIVOS EN CABA Y GRAN BUENOS AIRES</span>
        </div>
        <div className="promo-strip-track" aria-hidden="true">
          <span className="promo-truck" aria-hidden="true">
            <span className="promo-truck-icon" />
          </span>
          <span className="promo-text">ENVIOS GRATIS DESDE $50.000 ARS</span>
          <span className="promo-separator">|</span>
          <span className="promo-text">ENVIOS EXCLUSIVOS EN CABA Y GRAN BUENOS AIRES</span>
        </div>
      </div>
    </section>
  );
}
