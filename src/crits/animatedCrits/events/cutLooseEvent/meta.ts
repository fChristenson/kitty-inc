import type { EventMeta } from "../../eventMeta";

// swift slashes cut across the dark locked floor of the frozen screen in
// quick fire, glitter spilling out of every cut; a cross of two long cuts
// tears through it and it bursts open
export default {
  label: "Cut Loose",
  style: "slice",
  reward: "free floors",
  chance: 0.01,
  values: {
    firstMs: 300, // from the click till the first cut
    gapsMs: [240, 140] as [number, number], // between the cuts, quickening
    crossGapMs: 200, // from the last cut till the cross
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
