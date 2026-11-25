// Photos for the home page (Member 1). All from Unsplash (free Unsplash License).
// Unsplash's CDN resizes them (w=...), so the browser loads small files directly — use <Image unoptimized>.
// Keyed by the seeded city code (reference data "cityId").

const unsplash = (id: string, width = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=75`;

export const DESTINATION_PHOTOS: Record<string, { photo: string; tagline: string; alt: string }> = {
  cairo: { photo: unsplash("1539768942893-daf53e448371", 1400), tagline: "Pyramids, the Nile and street food", alt: "Camels walking past the pyramids of Giza" },
  dubai: { photo: unsplash("1512453979798-5ea266f8880c"), tagline: "Skylines, souks and desert dunes", alt: "The Burj Khalifa above Dubai's skyline" },
  london: { photo: unsplash("1486299267070-83823f5448dd"), tagline: "Museums, markets and royal parks", alt: "Big Ben and Westminster in London" },
  new_york: { photo: unsplash("1496588152823-86ff7695e68f"), tagline: "Broadway, bagels and Central Park", alt: "Brooklyn Bridge and the Manhattan skyline" },
  paris: { photo: unsplash("1502602898657-3e91760cbb34"), tagline: "Cafés, art and evening walks", alt: "The Eiffel Tower in Paris" },
  tokyo: { photo: unsplash("1513407030348-c983a97b98d8"), tagline: "Temples, neon and ramen", alt: "Tokyo Tower lit up at dusk" },
  riyadh: { photo: unsplash("1694018359679-49465b4c0d61"), tagline: "Heritage, desert and modern sights", alt: "The Kingdom Centre tower in Riyadh at sunset" },
  frankfurt: { photo: unsplash("1626447637943-4c9d412fa8cf"), tagline: "Old town, river walks and skyline", alt: "Frankfurt skyline under white clouds" },
};

export const FALLBACK_PHOTO = { photo: unsplash("1506929562872-bb421503ef21"), tagline: "Explore stays and things to do", alt: "Boats on a turquoise coast seen from above" };

export const HERO_PHOTO = { photo: unsplash("1506929562872-bb421503ef21", 2000), alt: "Boats on a turquoise coast seen from above" };
export const PLANNER_PHOTO = { photo: unsplash("1516546453174-5e1098a4b4af", 1200), alt: "Glasses resting on a travel map" };
export const STAYS_PHOTO = { photo: unsplash("1571003123894-1f0594d2b5d9", 1600), alt: "Resort pool overlooking the sea" };
