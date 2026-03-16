import { useEffect, useState } from "react";

export default function WelcomeDiscountModal({ isOpen, onClose, expiresAt, isDiscountActive = false, onActivate }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    if (!isOpen || !expiresAt || !isDiscountActive) return;

    const calculateTimeLeft = () => {
      const difference = new Date(expiresAt).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, expiresAt, isDiscountActive]);

  async function handleActivateClick() {
    if (!onActivate || isActivating) return;
    setIsActivating(true);
    try {
      await onActivate();
    } finally {
      setIsActivating(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div 
        className="welcome-discount-modal" 
        role="dialog" 
        aria-modal="true" 
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="login-modal-close" onClick={onClose} aria-label="Cerrar ventana">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6 18 18" />
            <path d="m18 6-12 12" />
          </svg>
        </button>

        <div className="welcome-discount-layout">
          {/* Left column — icon + badge */}
          <div className="welcome-discount-left">
            <div className="welcome-discount-icon">
              <svg viewBox="0 0 64 64" style={{width: '100%', height: '100%', display: 'block'}}>
                <path fill="#1877f2" d="M51.429 15.856c4.558-4.299-.715-9.875-10.687-6.421c-.587.204-1.133.419-1.648.642c.977-1.876 2.42-3.924 4.58-5.885c0 0-4.034 1.449-5.898 1.082C35.464 4.819 34.739 2 34.739 2s-2.405 5.238-3.63 9.349c-1.754-3.532-3.697-6.969-3.697-6.969s-1.037 2.404-2.936 3.318c-1.531.74-7.829 1.378-7.829 1.378c2.1 1.074 3.903 2.401 5.433 3.774c-1.609-.426-3.446-.746-5.547-.898c-8.344-.605-11.621 2.372-10.505 5.313L2 17.394l2.192 8.219L5.554 26c3.232 10.949 2.45 23.098 2.44 23.235l-.055.792l.754.222C20.766 53.805 31.735 62 31.735 62s14.222-9.412 22.042-11.753l.684-.205l.014-.72c.004-.17.346-15.334 4.271-25.218c.276-.039.536-.07.759-.084l.827-.05l.083-.832c.003-.033.341-4.796 1.586-6.739zM4.587 19.7l6.483 1.759v4.063l-5.381-1.528zm10.074 30.512a70 70 0 0 0-4.681-1.63c.128-2.822.313-12.549-2.233-21.96l4.71 1.338c.912 4.023 2.426 12.311 2.204 22.252m7.893-35.169c8.094.586 9.517 4.764 9.517 4.764s-4.931 1.803-7.978 1.803c-9.942 0-11.378-7.28-1.539-6.567m9.988 5.379l8.126.921l-10.13 2.451l-5.786-1.293zm-9.729 3.661l6.76 1.51v5.184l-6.979-1.947zm8.041 34.937c-1.476-1.096-3.936-2.787-7.202-4.6c.259-4.777.29-17.541.291-23.198l6.911 1.963zm9.046-4.356a138 138 0 0 0-7.1 4.496V32.29a511 511 0 0 1 8.162-2.917c-.587 5.658-.954 20.424-1.062 25.291m3.28-27.832s-9.738 3.125-11.659 3.834V25.58l11.811-2.858zm-1.2-7.461c-4.559 1.168-9.408.344-9.408.344s-.909-4.465 6.451-7.014c8.946-3.099 12.483 4.229 2.957 6.67m6.711-1.699l5.796.326l-3.481.843l-4.157-.41c.673-.234 1.284-.49 1.842-.759m3.856 30.9c-1.447.473-2.973 1.092-4.511 1.793c.011-4.684.297-15.066 2.467-24.145c2.231-.688 4.299-1.275 5.987-1.672c-3.227 8.986-3.838 20.96-3.943 24.024m6.038-26.431s-3.201.938-5.245 1.502l.514-3.468l5.565-1.346c-.456 1.255-.834 3.312-.834 3.312"/>
              </svg>
            </div>

            <div className="welcome-discount-badge">
              <div className="discount-badge-star">⭐</div>
              <div className="discount-badge-text">
                <span className="discount-percentage">10% OFF</span>
                <span className="discount-subtitle">¡ACTIVADO!</span>
              </div>
              <div className="discount-badge-star">⭐</div>
            </div>
          </div>

          {/* Right column — content */}
          <div className="welcome-discount-right">
            <h2 className="welcome-discount-title">
              ¡Bienvenido/a a La Boutique de la Limpieza!
            </h2>

            <p className="welcome-discount-message">
              {isDiscountActive
                ? <>Tu descuento de bienvenida del <strong>10%</strong> ha sido activado exitosamente.</>
                : <>Tenés un beneficio de bienvenida: <strong>10% OFF</strong> en tu primera compra. ¡Activalo cuando estés listo para comprar!</>
              }
            </p>

            {isDiscountActive ? (
              <>
                <div className="welcome-discount-timer-box">
                  <div className="timer-label" style={{display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}>
                    <svg viewBox="0 0 24 24" style={{width: '18px', height: '18px', display: 'block'}}>
                      <path fill="currentColor" fillRule="evenodd" d="m12.6 11.503l3.891 3.891l-.848.849L11.4 12V6h1.2zM12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m0-1.2a8.8 8.8 0 1 0 0-17.6a8.8 8.8 0 0 0 0 17.6"/>
                    </svg>
                    Tiempo disponible
                  </div>
                  <div className="timer-countdown">
                    <div className="timer-unit">
                      <div className="timer-value">{String(timeLeft.hours).padStart(2, '0')}</div>
                      <div className="timer-name">horas</div>
                    </div>
                    <div className="timer-separator">:</div>
                    <div className="timer-unit">
                      <div className="timer-value">{String(timeLeft.minutes).padStart(2, '0')}</div>
                      <div className="timer-name">minutos</div>
                    </div>
                    <div className="timer-separator">:</div>
                    <div className="timer-unit">
                      <div className="timer-value">{String(timeLeft.seconds).padStart(2, '0')}</div>
                      <div className="timer-name">segundos</div>
                    </div>
                  </div>
                </div>

                <div className="welcome-discount-features">
                  <div className="feature-item">
                    <div className="feature-icon">✓</div>
                    <div className="feature-text">Se aplica automáticamente en tu primera compra</div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">✓</div>
                    <div className="feature-text">Válido por única vez en las próximas 24 horas</div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">✓</div>
                    <div className="feature-text">Descuento sobre el total de tu pedido</div>
                  </div>
                </div>

                <button type="button" className="welcome-discount-cta" onClick={onClose}>
                  ¡Empezar a Comprar!
                </button>

                <p className="welcome-discount-tip">
                  💡 <strong>Consejo:</strong> El temporizador estará visible en el carrito para que no pierdas tu descuento.
                </p>
              </>
            ) : (
              <>
                <div className="welcome-discount-features">
                  <div className="feature-item">
                    <div className="feature-icon">✓</div>
                    <div className="feature-text">10% de descuento sobre el total de tu pedido</div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">✓</div>
                    <div className="feature-text">Válido por 24 horas desde que lo activás</div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">✓</div>
                    <div className="feature-text">Un solo uso — ¡usalo cuando estés listo!</div>
                  </div>
                </div>

                <button
                  type="button"
                  className="welcome-discount-cta"
                  onClick={handleActivateClick}
                  disabled={isActivating}
                >
                  {isActivating ? "Activando..." : "🎁 Activar 10% OFF ahora"}
                </button>

                <button type="button" className="welcome-discount-later" onClick={onClose}>
                  Activar más tarde
                </button>

                <p className="welcome-discount-tip">
                  💡 <strong>Consejo:</strong> Una vez activado, el descuento dura 24 horas. Activalo cuando vayas a comprar.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
