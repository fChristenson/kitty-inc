import type { EventMeta } from "../../eventMeta";

// the rare "Constellation" event: a light links several on-screen workers
// into a star, then each flares and climbs one perma tier
export default {
  label: "Constellation",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    appearMs: 500, // the stars twinkling up over the workers
    linkMs: 800, // the light drawing the whole star
    flareGapMs: 220, // between one star flaring and the next
    maxStars: 7, // at least 3 promotable workers in view are needed
  },
} as const satisfies EventMeta;
