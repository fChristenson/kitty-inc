import type { EventMeta } from "../../eventMeta";

// flares mark spots for a jet's bombs
export default {
  label: "Airstrike",
  style: "explosion",
  reward: "hires",
  chance: 0.01,
  values: {
    markMs: 450, // the flares tossed
    flyMs: 1_000, // the jet's pass
    fallMs: 260, // each bomb's fall
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
