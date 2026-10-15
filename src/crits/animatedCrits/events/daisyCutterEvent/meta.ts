import type { EventMeta } from "../../eventMeta";

// one bomb's shockwave
export default {
  label: "Daisy Cutter",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    dropMs: 520, // the bomb's fall
    waveMs: 700, // the shockwave's sweep outward
    levelShare: 0.12, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
