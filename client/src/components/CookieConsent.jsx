import { useState, useEffect } from "react";

const CONSENT_KEY = "cookie_consent";

export function hasCookieConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(CONSENT_KEY);
      if (!consent) {
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch { /* ignore */ }
  }, []);

  function handleAccept() {
    try { localStorage.setItem(CONSENT_KEY, "accepted"); } catch { /* ignore */ }
    dismiss();
  }

  function handleReject() {
    try { localStorage.setItem(CONSENT_KEY, "rejected"); } catch { /* ignore */ }
    dismiss();
  }

  function dismiss() {
    setIsClosing(true);
    setTimeout(() => setVisible(false), 300);
  }

  if (!visible) return null;

  return (
    <div className={`cookie-consent${isClosing ? " is-closing" : ""}`}>
      <div className="cookie-consent-inner">
        <div className="cookie-consent-text">
          <div className="cookie-consent-icon">
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="10" r="1.5" fill="currentColor" />
              <circle cx="15" cy="8" r="1" fill="currentColor" />
              <circle cx="13" cy="14" r="1.5" fill="currentColor" />
              <circle cx="9" cy="15" r="1" fill="currentColor" />
              <circle cx="16" cy="12" r="0.8" fill="currentColor" />
            </svg>
          </div>
          <p>
            Usamos cookies para mejorar tu experiencia y analizar el tráfico del sitio.
            <span className="cookie-consent-detail"> No compartimos tus datos con terceros.</span>
          </p>
        </div>
        <div className="cookie-consent-actions">
          <button type="button" className="cookie-consent-reject" onClick={handleReject}>
            Rechazar
          </button>
          <button type="button" className="cookie-consent-accept" onClick={handleAccept}>
            Aceptar cookies
          </button>
        </div>
      </div>
    </div>
  );
}
