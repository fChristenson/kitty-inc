import type { EventMeta } from "../../eventMeta";

// a pleated band of cash squeezes like an accordion
export default {
  label: "Accordion",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    formMs: 450, // the band folding out
    gapsMs: [320, 270, 230, 190, 160], // before each squeeze
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
