import { useEffect, useState } from "react";

export default function LoginModal({
  isOpen,
  onClose,
  onSubmit,
  onVerifyEmail,
  onResendCode,
  isLoading,
  error,
  initialView = "register",
  inviteMessage = "",
  verificationEmail = ""
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [view, setView] = useState("register");
  const [registerStep, setRegisterStep] = useState("options");
  const [localMessage, setLocalMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setView(initialView === "login" ? "login" : verificationEmail ? "verify" : "register");
      setRegisterStep(verificationEmail ? "verify" : "options");
      setLocalMessage("");
      setVerificationCode("");
    }
  }, [isOpen, initialView, verificationEmail]);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (view === "register") {
      onSubmit({
        mode: "register",
        name,
        email,
        password,
        phone,
        address
      });
      return;
    }

    onSubmit({
      mode: "login",
      email,
      password
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="login-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="login-modal-close" onClick={onClose} aria-label="Cerrar ventana">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6 18 18" />
            <path d="m18 6-12 12" />
          </svg>
        </button>

        {view === "register" ? (
          <>
            <h2>Registrate</h2>
            {inviteMessage ? <p className="form-info">{inviteMessage}</p> : null}
            <p className="register-intro">
              ¿Ya tienes un perfil personal?{" "}
              <button type="button" className="premium-login-link" onClick={() => setView("login")}>
                Iniciar sesión
              </button>
            </p>

            {registerStep === "options" ? (
              <div className="register-options" role="group" aria-label="Opciones de registro">
                <button
                  type="button"
                  className="register-provider-btn google"
                  onClick={() => setLocalMessage("El acceso con Google estará disponible nuevamente en breve.")}
                >
                  <span className="provider-icon" aria-hidden="true">
                    <svg viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.74 1.22 9.26 3.62l6.9-6.9C35.96 2.34 30.42 0 24 0 14.62 0 6.54 5.38 2.6 13.22l8.02 6.23C12.54 13.62 17.82 9.5 24 9.5Z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.14-3.08-.4-4.55H24v9.1h12.94c-.58 2.98-2.24 5.5-4.78 7.2l7.74 6c4.52-4.16 7.08-10.3 7.08-17.75Z" />
                      <path fill="#FBBC05" d="M10.62 28.55A14.5 14.5 0 0 1 9.8 24c0-1.58.28-3.1.82-4.55L2.6 13.22A24.06 24.06 0 0 0 0 24c0 3.88.93 7.55 2.6 10.78l8.02-6.23Z" />
                      <path fill="#34A853" d="M24 48c6.42 0 11.82-2.12 15.76-5.76l-7.74-6c-2.12 1.44-4.84 2.26-8.02 2.26-6.18 0-11.46-4.12-13.38-9.95L2.6 34.78C6.54 42.62 14.62 48 24 48Z" />
                    </svg>
                  </span>
                  <span>Registrarse con Google</span>
                </button>

                <div className="register-divider" aria-hidden="true">
                  <span />
                  <strong>o</strong>
                  <span />
                </div>

                <button
                  type="button"
                  className="register-provider-btn mail"
                  onClick={() => {
                    setRegisterStep("email");
                    setLocalMessage("");
                  }}
                >
                  <span className="provider-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <rect x="3" y="6" width="18" height="12" rx="2.2" ry="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      <path d="m4.5 8 7.5 5.7L19.5 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>Registrarte por mail</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <label htmlFor="register-name">Nombre y apellido</label>
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />

                <label htmlFor="register-email">Email</label>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />

                <label htmlFor="register-phone">Teléfono</label>
                <input
                  id="register-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Ej: 11 1234-5678"
                  required
                />

                <label htmlFor="register-address">Dirección</label>
                <input
                  id="register-address"
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Opcional (la podés completar al comprar)"
                />

                <label htmlFor="register-password">Contraseña</label>
                <div className="password-field">
                  <input
                    id="register-password"
                    type={isPasswordVisible ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={4}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setIsPasswordVisible((current) => !current)}
                    aria-label={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {isPasswordVisible ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 4.5 19.5 21" />
                        <path d="M9.35 9.35A3.8 3.8 0 0 0 12 16a3.8 3.8 0 0 0 2.63-1.05" />
                        <path d="M6.35 6.35A13.7 13.7 0 0 0 2.5 12s3.2 6 9.5 6c2 0 3.72-.6 5.15-1.53" />
                        <path d="M10.55 5.2A10.7 10.7 0 0 1 12 5c6.3 0 9.5 7 9.5 7a14.4 14.4 0 0 1-3.1 4.22" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2.5 12S5.7 5 12 5s9.5 7 9.5 7-3.2 7-9.5 7S2.5 12 2.5 12Z" />
                        <circle cx="12" cy="12" r="3.6" />
                      </svg>
                    )}
                  </button>
                </div>

                {error && <p className="form-error">{error}</p>}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setRegisterStep("options");
                      setLocalMessage("");
                    }}
                  >
                    Volver
                  </button>
                  <button type="submit" disabled={isLoading}>
                    {isLoading ? "Creando cuenta..." : "Crear cuenta"}
                  </button>
                </div>
              </form>
            )}

            {localMessage ? <p className="form-info">{localMessage}</p> : null}
            <p className="register-disclaimer">
              La dirección solo es obligatoria al momento de concretar una compra.
            </p>
          </>
        ) : view === "verify" ? (
          <>
            <h2>Verificá tu Email</h2>
            <p className="register-intro">
              Te enviamos un código de 6 dígitos a <strong>{verificationEmail || email}</strong>
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (onVerifyEmail) {
                onVerifyEmail(verificationEmail || email, verificationCode);
              }
            }}>
              <label htmlFor="verify-code">Código de Verificación</label>
              <input
                id="verify-code"
                type="text"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder="000000"
                maxLength={6}
                pattern="[0-9]{6}"
                required
                autoFocus
                style={{ fontSize: "24px", textAlign: "center", letterSpacing: "8px" }}
              />

              {error && <p className="form-error">{error}</p>}

              <div className="modal-actions">
                <button type="submit" disabled={isLoading || verificationCode.length !== 6}>
                  {isLoading ? "Verificando..." : "Verificar"}
                </button>
              </div>
            </form>

            <p className="register-intro" style={{ marginTop: "20px" }}>
              ¿No recibiste el código?{" "}
              <button 
                type="button" 
                className="premium-login-link" 
                onClick={() => {
                  if (onResendCode) {
                    onResendCode(verificationEmail || email);
                  }
                }}
                disabled={isLoading}
              >
                Reenviar código
              </button>
            </p>
          </>
        ) : (
          <>
            <h2>Iniciar sesión</h2>
            <p className="register-intro">
              Accedé con tu email y contraseña.
              <button type="button" className="premium-login-link subtle" onClick={() => setView("register")}>
                Volver a registro
              </button>
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <label htmlFor="login-password">Contraseña</label>
              <div className="password-field">
                <input
                  id="login-password"
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setIsPasswordVisible((current) => !current)}
                  aria-label={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {isPasswordVisible ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 4.5 19.5 21" />
                      <path d="M9.35 9.35A3.8 3.8 0 0 0 12 16a3.8 3.8 0 0 0 2.63-1.05" />
                      <path d="M6.35 6.35A13.7 13.7 0 0 0 2.5 12s3.2 6 9.5 6c2 0 3.72-.6 5.15-1.53" />
                      <path d="M10.55 5.2A10.7 10.7 0 0 1 12 5c6.3 0 9.5 7 9.5 7a14.4 14.4 0 0 1-3.1 4.22" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12S5.7 5 12 5s9.5 7 9.5 7-3.2 7-9.5 7S2.5 12 2.5 12Z" />
                      <circle cx="12" cy="12" r="3.6" />
                    </svg>
                  )}
                </button>
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" disabled={isLoading}>
                  {isLoading ? "Ingresando..." : "Ingresar"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
