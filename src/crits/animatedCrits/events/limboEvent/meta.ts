import type { EventMeta } from "../../eventMeta";

// a dancer limbos under each pole
export default {
  label: "Limbo",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    slidesMs: [380, 240] as [number, number], // each slide, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
