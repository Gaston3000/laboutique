import { useMemo, useState } from "react";
import "../styles/BrandsCarousel.css";

const BRANDS = [
  { name: "Suiza", logo: "suiza.webp", category: "Suiza" },
  { name: "Ariel", logo: "ariel.webp", category: "Ariel" },
  { name: "Ayudin", logo: "ayudin.webp", category: "Ayudin" },
  { name: "Cif", logo: "cif.webp", category: "Cif" },
  { name: "Glade", logo: "glade.webp", category: "Glade" },
  { name: "Harpic", logo: "harpic.webp", category: "Harpic" },
  { name: "Lysoform", logo: "lysoform.webp", category: "Lysoform" },
  { name: "Magistral", logo: "magistral.webp", category: "Magistral" },
  { name: "Mr Músculo", logo: "mrmuscle.webp", category: "Mr Músculo" },
  { name: "OFF!", logo: "off.webp", category: "OFF!" },
  { name: "Poett", logo: "poett.webp", category: "Poett" },
  { name: "Raid", logo: "raid.webp", category: "Raid" },
  { name: "Saphirus", logo: "saphirus.webp", category: "Saphirus" },
  { name: "Florida", logo: "florida.webp", category: "Florida" },
  { name: "Blem", logo: "blem.webp", category: "Blem" },
  { name: "Make", logo: "make.webp", category: "Make" },
  { name: "Procenex", logo: "procenex.webp", category: "Procenex" },
  { name: "Pato", logo: "pato.webp", category: "Pato Purific" },
  { name: "Ala", logo: "ala.webp", category: "Ala" },
  { name: "Comfort", logo: "comfort.webp", category: "Comfort" },
  { name: "Downy", logo: "downy.webp", category: "Downy" },
  { name: "Drive", logo: "drive.webp", category: "Drive" },
  { name: "Finish", logo: "finish.webp", category: "Finish" },
  { name: "Fuyi", logo: "fuyi.webp", category: "Fuyi" },
  { name: "Qualibest", logo: "qualibest.webp", category: "Qualibest" }
];

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
const BrandsCarousel = ({ onSelectBrand }) => {
  const [failedLogos, setFailedLogos] = useState({});

  // Brand logos array
  // TO ADD MORE BRANDS: Add a new object to this array with name and filename
  // Place the logo image in: client/public/fotos/logos marcas/
  // For logos in other folders, use customPath property
  const marqueeBrands = useMemo(() => [...BRANDS, ...BRANDS], []);

  function handleBrandClick(brand) {
    if (typeof onSelectBrand === "function") {
      onSelectBrand(brand.category || brand.name);
    }
  }

  return (
    <section className="brands-carousel-section" aria-label="Marcas que vendemos">
      <div className="brands-carousel-container">
        <div className="brands-carousel">
          <div className="brands-track">
            {marqueeBrands.map((brand, index) => (
              <div key={`${brand.name}-${index}`} className="brand-item">
                <button
                  type="button"
                  className="brand-item-button"
                  aria-label={`Ver productos de ${brand.name}`}
                  onClick={() => handleBrandClick(brand)}
                >
                  {failedLogos[brand.logo] ? (
                    <span className="brand-fallback">{brand.name}</span>
                  ) : (
                    <img
                      src={brand.customPath ? `${brand.customPath}/${brand.logo}` : `/fotos/logos marcas/${brand.logo}`}
                      alt={`Logo de ${brand.name}`}
                      loading="lazy"
                      onError={() => {
                        setFailedLogos((current) => ({ ...current, [brand.logo]: true }));
                      }}
                    />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandsCarousel;
