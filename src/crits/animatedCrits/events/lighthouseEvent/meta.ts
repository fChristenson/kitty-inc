import type { EventMeta } from "../../eventMeta";

// the rare "Lighthouse" event: a lamp in the middle of the screen sweeps its
// beam one full turn round; every upgrade button in view it lights shines,
// granting free upgrade levels
export default {
  label: "Lighthouse",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    flyMs: 450, // the wisp flying up out of the button to the lamp's spot
    sweepMs: 2_400, // the beam's one full turn
    holdMs: 900, // after the beam fades, before the screen unfreezes
    levelShare: 0.1, // free levels per floor, of its current level
    minLevels: 10,
  },
} as const satisfies EventMeta;
