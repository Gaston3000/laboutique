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
  // For logos in other folders, use customPath property
  const brands = [
    { name: "Suiza", logo: "suiza.png" },
    { name: "Ariel", logo: "ariel.png" },
    { name: "Ayudin", logo: "ayudin.png" },
    { name: "Cif", logo: "cif.png" },
    { name: "Glade", logo: "glade.png" },
    { name: "Harpic", logo: "harpic.png" },
    { name: "Lysoform", logo: "lysoform.png" },
    { name: "Magistral", logo: "magistral.png" },
    { name: "Mr Muscle", logo: "mrmuscle.png" },
    { name: "OFF!", logo: "off.png" },
    { name: "Poett", logo: "poett.png" },
    { name: "Raid", logo: "raid.png" },
    { name: "Saphirus", logo: "saphirus.png" },
    { name: "Florida", logo: "florida.png" },
    { name: "Blem", logo: "blem.png" },
    { name: "Make", logo: "make.png" },
    { name: "Procenex", logo: "procenex.png" },
    { name: "Pato", logo: "pato.png" },
    { name: "Ala", logo: "ala.png" },
    { name: "Comfort", logo: "comfort.png" },
    { name: "Downy", logo: "downy.png" },
    { name: "Drive", logo: "drive.png" },
    { name: "Finish", logo: "finish.png" },
    { name: "Fuyi", logo: "fuyi.png" },
    { name: "Qualibest", logo: "qualibest.png" },
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
                  src={brand.customPath ? `${brand.customPath}/${brand.logo}` : `/fotos/logos marcas/${brand.logo}`}
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
