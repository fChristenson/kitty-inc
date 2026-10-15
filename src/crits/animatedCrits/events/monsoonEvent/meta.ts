import type { EventMeta } from "../../eventMeta";

// drops of light fall onto the workers, each a splash and a flat ring, a
// drizzle quickening to a downpour, a worker's second drop a perma tier up;
// then one huge drop into their midst
export default {
  label: "Monsoon",
  style: "ripple",
  reward: "perma tiers",
  chance: 0.01,
  values: {
    firstMs: 250, // from the click till the first drop lands
    gapsMs: [170, 35] as [number, number], // between drops, closing to a downpour
    bigGapMs: 300, // from the last drop till the huge one lands
    bigFallMs: 420, // the huge drop's fall
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
