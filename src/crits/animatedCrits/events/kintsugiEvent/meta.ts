import type { EventMeta } from "../../eventMeta";

// cracks across the bars fill with gold
export default {
  label: "Kintsugi",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    crackMs: 550, // each seam filling
    gapMs: 180, // between seams starting
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per seam
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
