import { useEffect, useRef } from "react";
import "../styles/BrandsCarousel.css";

/**
 * BrandsCarousel Component - Minimal Design
 * 
 * Clean horizontal infinite-scrolling carousel of brand logos.
 * Amazon-style minimal design - just logos with subtle hover effects.
 * 
 * Features:
 * - Smooth auto-scrolling animation
 * - Pauses on hover
 * - Infinite seamless loop
 * - Responsive design
 * - Subtle opacity and scale effects on hover
 */
const BrandsCarousel = () => {
  const carouselRef = useRef(null);

  // Brand logos array
  // TO ADD MORE BRANDS: Add a new object to this array with name and filename
  // Place the logo image in: client/public/fotos/logos marcas/
  const brands = [
    { name: "Marca 1", logo: "1.jpg" },
    { name: "Marca 2", logo: "2.jpg" },
    { name: "Marca 3", logo: "3.jpg" },
    { name: "Marca 4", logo: "4.jpg" },
    { name: "Suiza", logo: "5.jpg" },
    { name: "Marca 6", logo: "6.jpg" },
    { name: "Marca 7", logo: "7.jpg" },
    { name: "Marca 8", logo: "8.jpg" },
    { name: "Marca 9", logo: "9.jpg" },
    { name: "Marca 10", logo: "10.jpg" },
    { name: "Marca 11", logo: "11.jpg" },
    { name: "Marca 12", logo: "12.jpg" },
    { name: "Marca 13", logo: "13.jpg" },
    { name: "Marca 14", logo: "14.jpg" },
    { name: "Marca 15", logo: "15.jpg" },
    { name: "Marca 16", logo: "16.jpg" },
    { name: "Marca 17", logo: "17.jpg" },
    { name: "Marca 18", logo: "18.jpg" },
    { name: "Marca 19", logo: "19.jpg" },
    { name: "Marca 20", logo: "20.jpg" },
  ];

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    // Clone the brand items to create seamless infinite loop
    const track = carousel.querySelector(".brands-track");
    const items = Array.from(track.children);
    
    // Clone each item and append to create seamless loop
    items.forEach(item => {
      const clone = item.cloneNode(true);
      track.appendChild(clone);
    });
  }, []);

  return (
    <section className="brands-carousel-section" aria-label="Marcas que vendemos">
      <div className="brands-carousel-container">
        <div className="brands-carousel" ref={carouselRef}>
          <div className="brands-track">
            {brands.map((brand, index) => (
              <div key={`${brand.name}-${index}`} className="brand-item">
                <img
                  src={`/fotos/logos marcas/${brand.logo}`}
                  alt={`Logo de ${brand.name}`}
                  loading="lazy"
                  onError={(e) => {
                    // Fallback if image not found - show brand name
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<span class="brand-fallback">${brand.name}</span>`;
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandsCarousel;
