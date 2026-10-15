import type { EventMeta } from "../../eventMeta";

// equalizer columns leap to the bars
export default {
  label: "Equalizer",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    riseMs: 300, // the columns rising
    beatsMs: [320, 150] as [number, number], // between beats, quickening
    levelShare: 0.03, // of the bar's levels, per beat
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
