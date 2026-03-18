import { useEffect, useMemo, useRef, useState } from "react";

const BANNER_SLIDES = [
  {
    id: "banner-1",
    desktopSrc: "/fotos/Banners/banner1.png",
    mobileSrc: "/fotos/Banners/bannercelu1.png",
    alt: "Promoción destacada de limpieza",
    title: "Soluciones premium para cada espacio"
  },
  {
    id: "banner-2",
    desktopSrc: "/fotos/Banners/banner2.png",
    mobileSrc: "/fotos/Banners/bannercelu2.png",
    alt: "Novedades para el hogar y la limpieza profesional",
    title: "Novedades que elevan tu rutina"
  },
  {
    id: "banner-3",
    desktopSrc: "/fotos/Banners/banner3.png",
    mobileSrc: "/fotos/Banners/bannercelu3.png",
    alt: "Ofertas exclusivas en productos de limpieza",
    title: "Promos exclusivas por tiempo limitado"
  }
];

const AUTOPLAY_INTERVAL_MS = 6000;
const SWIPE_MIN_DISTANCE_PX = 34;
const BANNERS_ASSET_VERSION = "2026-03-12-3";

function withBannerVersion(assetPath) {
  return `${assetPath}?v=${BANNERS_ASSET_VERSION}`;
}

export default function HomeBanners({ onExploreProducts, onViewPromotions }) {
  const slides = useMemo(
    () =>
      BANNER_SLIDES.map((slide) => ({
        ...slide,
        desktopSrc: withBannerVersion(slide.desktopSrc),
        mobileSrc: withBannerVersion(slide.mobileSrc)
      })),
    []
  );
  const virtualSlides = useMemo(() => {
    if (!slides.length) {
      return [];
    }

    const firstSlide = slides[0];
    const lastSlide = slides[slides.length - 1];
    return [
      { ...lastSlide, id: `${lastSlide.id}-clone-start`, originalIndex: slides.length - 1 },
      ...slides.map((slide, index) => ({ ...slide, originalIndex: index })),
      { ...firstSlide, id: `${firstSlide.id}-clone-end`, originalIndex: 0 }
    ];
  }, [slides]);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const sectionRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);
  const lastVirtualIndex = virtualSlides.length - 1;

  const activeIndex = useMemo(() => {
    if (!slides.length) {
      return 0;
    }

    if (currentIndex === 0) {
      return slides.length - 1;
    }

    if (currentIndex === virtualSlides.length - 1) {
      return 0;
    }

    return currentIndex - 1;
  }, [currentIndex, slides.length, virtualSlides.length]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setCurrentIndex((current) => Math.min(current + 1, lastVirtualIndex));
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(timerId);
  }, [isPaused, slides.length, lastVirtualIndex]);

  function goToNext() {
    if (!slides.length) {
      return;
    }

    setIsTransitionEnabled(true);
    setCurrentIndex((current) => Math.min(current + 1, lastVirtualIndex));
  }

  function goToPrevious() {
    if (!slides.length) {
      return;
    }

    setIsTransitionEnabled(true);
    setCurrentIndex((current) => Math.max(current - 1, 0));
  }

  function goToSlide(index) {
    if (!slides.length) {
      return;
    }

    setIsTransitionEnabled(true);
    setCurrentIndex(index + 1);
  }

  function handleTrackTransitionEnd() {
    if (!slides.length || virtualSlides.length <= 1) {
      return;
    }

    if (currentIndex === virtualSlides.length - 1) {
      setIsTransitionEnabled(false);
      setCurrentIndex(1);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setIsTransitionEnabled(true));
      });
      return;
    }

    if (currentIndex === 0) {
      setIsTransitionEnabled(false);
      setCurrentIndex(virtualSlides.length - 2);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setIsTransitionEnabled(true));
      });
    }
  }

  function handleTouchStart(event) {
    touchStartXRef.current = event.changedTouches[0]?.clientX || 0;
    touchEndXRef.current = touchStartXRef.current;
  }

  function handleTouchMove(event) {
    touchEndXRef.current = event.changedTouches[0]?.clientX || touchStartXRef.current;
  }

  function handleTouchEnd() {
    const deltaX = touchEndXRef.current - touchStartXRef.current;

    if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE_PX) {
      return;
    }

    if (deltaX < 0) {
      goToNext();
      return;
    }

    goToPrevious();
  }

  function handleBlurCapture(event) {
    const nextFocusedElement = event.relatedTarget;
    if (nextFocusedElement instanceof Element && sectionRef.current?.contains(nextFocusedElement)) {
      return;
    }

    setIsPaused(false);
  }

  return (
    <section
      ref={sectionRef}
      className="home-banners"
      aria-label="Banners destacados"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={handleBlurCapture}
    >
      <div className="home-banners-stage">
        <div
          className="home-banners-track"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: isTransitionEnabled ? undefined : "none"
          }}
          onTransitionEnd={handleTrackTransitionEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {virtualSlides.map((slide) => (
            <article
              key={slide.id}
              className="home-banners-slide"
              aria-hidden={activeIndex !== slide.originalIndex}
            >
              <picture>
                <source media="(max-width: 860px)" srcSet={slide.mobileSrc} />
                <img
                  src={slide.desktopSrc}
                  alt={slide.alt}
                  loading={slide.originalIndex === 0 ? "eager" : "lazy"}
                  fetchpriority={slide.originalIndex === 0 ? "high" : "auto"}
                  decoding="async"
                />
              </picture>
            </article>
          ))}
        </div>

        <div className="home-banners-overlay">
          <div className="home-banners-actions">
            <button type="button" className="home-banners-primary" onClick={onExploreProducts}>
              <span className="home-banners-btn-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" style={{width: '1.2em', height: '1.2em'}}>
                  <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
                    <path d="M7 13a5 5 0 0 1 10 0v5c0 1.886 0 2.828-.586 3.414S14.886 22 13 22h-2c-1.886 0-2.828 0-3.414-.586S7 19.886 7 18z"/>
                    <path d="M10 8V7c0-.943 0-1.414.293-1.707S11.057 5 12 5s1.414 0 1.707.293S14 6.057 14 7v1m-2-3V2m0 0h-2m2 0h2.745a3 3 0 0 1 2.041.802L17 3M7 13h10"/>
                  </g>
                </svg>
              </span>
              <span>Explorar productos</span>
            </button>
            <button type="button" className="home-banners-secondary" onClick={onViewPromotions}>
              <span className="home-banners-btn-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <circle cx="8" cy="8" r="2" />
                  <circle cx="16" cy="16" r="2" />
                  <path d="M7 17 17 7" />
                </svg>
              </span>
              <span>Ver promociones</span>
            </button>
            <a
              href="https://www.mercadolibre.com.ar/tienda/la-boutique-de-la-limpieza"
              target="_blank"
              rel="noopener noreferrer"
              className="home-banners-meli"
              aria-label="Visitá nuestra tienda en Mercado Libre"
            >
              <img
                src="/fotos/IconoML.png"
                alt=""
                className="home-banners-meli-icon"
                draggable="false"
              />
              <img
                src="/fotos/TituloML.png"
                alt="Mercado Libre"
                className="home-banners-meli-title"
                draggable="false"
              />
            </a>
          </div>
        </div>

        <button
          type="button"
          className="home-banners-arrow home-banners-arrow-prev"
          onClick={goToPrevious}
          aria-label="Ver banner anterior"
        >
          <span className="nav-arrow-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M7 10.5 12 15.5 17 10.5" />
            </svg>
          </span>
        </button>
        <button
          type="button"
          className="home-banners-arrow home-banners-arrow-next"
          onClick={goToNext}
          aria-label="Ver banner siguiente"
        >
          <span className="nav-arrow-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M7 10.5 12 15.5 17 10.5" />
            </svg>
          </span>
        </button>
      </div>

      <div className="home-banners-dots" role="tablist" aria-label="Selector de banners">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            className={`home-banners-dot${activeIndex === index ? " is-active" : ""}`}
            onClick={() => goToSlide(index)}
            aria-label={`Ver banner ${index + 1}`}
            aria-selected={activeIndex === index}
            role="tab"
          />
        ))}
      </div>

      <div className="home-banners-mobile-actions">
        <a
          href="https://www.mercadolibre.com.ar/tienda/la-boutique-de-la-limpieza"
          target="_blank"
          rel="noopener noreferrer"
          className="home-banners-meli"
          aria-label="Visitá nuestra tienda en Mercado Libre"
        >
          <img
            src="/fotos/IconoML.png"
            alt=""
            className="home-banners-meli-icon"
            draggable="false"
          />
          <img
            src="/fotos/TituloML.png"
            alt="Mercado Libre"
            className="home-banners-meli-title"
            draggable="false"
          />
        </a>
        <button type="button" className="home-banners-secondary" onClick={onViewPromotions}>
          <span className="home-banners-btn-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <circle cx="8" cy="8" r="2" />
              <circle cx="16" cy="16" r="2" />
              <path d="M7 17 17 7" />
            </svg>
          </span>
          <span>Ver promociones</span>
        </button>
        <button type="button" className="home-banners-primary" onClick={onExploreProducts}>
          <span className="home-banners-btn-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" style={{width: '1.2em', height: '1.2em'}}>
              <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
                <path d="M7 13a5 5 0 0 1 10 0v5c0 1.886 0 2.828-.586 3.414S14.886 22 13 22h-2c-1.886 0-2.828 0-3.414-.586S7 19.886 7 18z"/>
                <path d="M10 8V7c0-.943 0-1.414.293-1.707S11.057 5 12 5s1.414 0 1.707.293S14 6.057 14 7v1m-2-3V2m0 0h-2m2 0h2.745a3 3 0 0 1 2.041.802L17 3M7 13h10"/>
              </g>
            </svg>
          </span>
          <span>Explorar productos</span>
        </button>
      </div>
    </section>
  );
}
