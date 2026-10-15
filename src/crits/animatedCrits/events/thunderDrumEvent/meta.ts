import type { EventMeta } from "../../eventMeta";

// bolts drum on the bars
export default {
  label: "Thunder Drum",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    beatsMs: [170, 90] as [number, number], // between beats, quickening
    levelShare: 0.03, // of a bar's levels, per beat
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
