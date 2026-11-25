// Artwork for the destination tiles on the home page (Member 1). Uses theme colours only.
export const DESTINATION_ART: Record<string, { emoji: string; tagline: string; gradient: string }> = {
  cairo: { emoji: "🐪", tagline: "Pyramids, the Nile and street food", gradient: "linear-gradient(160deg, var(--color-sunset), var(--color-accent) 55%, var(--color-navy))" },
  dubai: { emoji: "🏙️", tagline: "Skylines, souks and desert dunes", gradient: "linear-gradient(160deg, var(--color-lime), var(--color-sunset) 45%, var(--color-navy-light))" },
  london: { emoji: "🎡", tagline: "Museums, markets and royal parks", gradient: "linear-gradient(160deg, var(--color-primary), var(--color-navy-light) 60%, var(--color-navy))" },
  new_york: { emoji: "🗽", tagline: "Broadway, bagels and Central Park", gradient: "linear-gradient(160deg, var(--color-accent), var(--color-primary) 60%, var(--color-navy))" },
  paris: { emoji: "🗼", tagline: "Cafés, art and evening walks", gradient: "linear-gradient(160deg, var(--color-primary-soft), var(--color-primary) 50%, var(--color-navy))" },
  tokyo: { emoji: "🏯", tagline: "Temples, neon and ramen", gradient: "linear-gradient(160deg, var(--color-accent-soft), var(--color-accent) 45%, var(--color-navy))" },
  riyadh: { emoji: "🕌", tagline: "Heritage, desert and modern sights", gradient: "linear-gradient(160deg, var(--color-lime), var(--color-accent) 60%, var(--color-navy-light))" },
  frankfurt: { emoji: "🏰", tagline: "Old town, river walks and trains", gradient: "linear-gradient(160deg, var(--color-info-soft), var(--color-info) 50%, var(--color-navy))" },
};

export const DEFAULT_ART = { emoji: "📍", tagline: "Explore stays and things to do", gradient: "linear-gradient(160deg, var(--color-primary), var(--color-navy))" };
