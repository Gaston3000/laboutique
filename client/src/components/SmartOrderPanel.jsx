import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sendSmartOrder } from "../api";

export default function SmartOrderPanel({ isOpen, onClose, products, onAddToCart, onOpenCart }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isOpen]);

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const message = input.trim();
    if (!message || isLoading) return;

    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const data = await sendSmartOrder(message);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleAddAll() {
    if (!result?.products?.length) return;
    const productMap = new Map((products || []).map((p) => [p.id, p]));
    let added = 0;

    for (const suggestion of result.products) {
      const product = productMap.get(suggestion.id);
      if (product && product.stock > 0) {
        onAddToCart(product, suggestion.quantity);
        added++;
      }
    }

    if (added > 0) {
      onOpenCart();
      handleClose();
    }
  }

  function handleAddOne(suggestion) {
    const productMap = new Map((products || []).map((p) => [p.id, p]));
    const product = productMap.get(suggestion.id);
    if (product && product.stock > 0) {
      onAddToCart(product, suggestion.quantity);
    }
  }

  function handleReset() {
    setInput("");
    setResult(null);
    setError("");
    inputRef.current?.focus();
  }

  function getProductData(id) {
    return (products || []).find((p) => p.id === id);
  }

  function getProductImage(product) {
    if (!product?.media?.length) return null;
    const first = product.media[0];
    return first?.url || first?.src || null;
  }

  if (!isOpen) return null;

  return createPortal(
    <div className={`smart-order-overlay${isClosing ? " is-closing" : ""}`} onClick={handleOverlayClick}>
      <div className={`smart-order-panel${isClosing ? " is-closing" : ""}`} ref={panelRef} role="dialog" aria-modal="true" aria-label="Pedido Inteligente">

        <header className="smart-order-header">
          <div className="smart-order-header-content">
            <span className="smart-order-header-icon" aria-hidden="true">
              <img src="/fotos/iconos%20general/lineicons--open-ai.svg" alt="" width="24" height="24" />
            </span>
            <div>
              <h2>Pedido Inteligente</h2>
              <p>Decinos qué necesitás y armamos tu carrito</p>
            </div>
          </div>
          <button type="button" className="smart-order-close" aria-label="Cerrar" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="smart-order-body">
          {!result && !isLoading && (
            <div className="smart-order-examples">
              <p>Probá con algo como:</p>
              <div className="smart-order-chips">
                {["Quiero limpiar baño y cocina", "Necesito productos para la ropa", "Aromatizantes para la casa"].map((example) => (
                  <button key={example} type="button" className="smart-order-chip" onClick={() => { setInput(example); inputRef.current?.focus(); }}>
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="smart-order-loading">
              <div className="smart-order-spinner" />
              <p>Analizando tu pedido…</p>
            </div>
          )}

          {error && (
            <div className="smart-order-error">
              <span className="smart-order-error-icon" aria-hidden="true">⚠</span>
              <p>{error}</p>
              <button type="button" onClick={handleReset}>Intentar de nuevo</button>
            </div>
          )}

          {result && (
            <div className="smart-order-result">
              <div className="smart-order-message">
                <span className="smart-order-ai-badge" aria-hidden="true">IA</span>
                <p>{result.message}</p>
              </div>

              {result.products.length > 0 ? (
                <>
                  <ul className="smart-order-products">
                    {result.products.map((suggestion) => {
                      const product = getProductData(suggestion.id);
                      if (!product) return null;
                      const imageUrl = getProductImage(product);

                      return (
                        <li key={suggestion.id} className="smart-order-product-card">
                          <div className="smart-order-product-image-wrap">
                            {imageUrl ? (
                              <img src={imageUrl} alt={product.name} className="smart-order-product-image" loading="lazy" />
                            ) : (
                              <div className="smart-order-product-no-image">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <rect x="3" y="3" width="18" height="18" rx="3" />
                                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
                                  <path d="m21 15-5-5L5 21" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="smart-order-product-info">
                            <strong className="smart-order-product-name">{product.name}</strong>
                            {product.brand && <span className="smart-order-product-brand">{product.brand}</span>}
                            <span className="smart-order-product-price">${Number(product.price).toLocaleString("es-AR")} ARS</span>
                            <span className="smart-order-product-reason">{suggestion.reason}</span>
                          </div>
                          <div className="smart-order-product-actions">
                            <span className="smart-order-product-qty">×{suggestion.quantity}</span>
                            <button type="button" className="smart-order-product-add" onClick={() => handleAddOne(suggestion)} aria-label={`Agregar ${product.name}`}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="smart-order-actions">
                    <button type="button" className="smart-order-add-all" onClick={handleAddAll}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                        <path d="M3 6h18" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                      </svg>
                      Agregar todo al carrito
                    </button>
                    <button type="button" className="smart-order-new" onClick={handleReset}>
                      Hacer otro pedido
                    </button>
                  </div>
                </>
              ) : (
                <div className="smart-order-empty">
                  <button type="button" onClick={handleReset}>Intentar con otra búsqueda</button>
                </div>
              )}
            </div>
          )}
        </div>

        <form className="smart-order-input-bar" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="¿Qué necesitás? Ej: productos para limpiar el baño"
            maxLength={500}
            disabled={isLoading}
            className="smart-order-input"
          />
          <button type="submit" className="smart-order-send" disabled={!input.trim() || isLoading} aria-label="Enviar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4 20-7Z" />
              <path d="m22 2-11 11" />
            </svg>
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
