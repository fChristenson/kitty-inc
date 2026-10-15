import type { EventMeta } from "../../eventMeta";

// a shockwave sets off mines
export default {
  label: "Ripple Mines",
  style: "explosion",
  reward: "hires",
  chance: 0.01,
  values: {
    waveMs: 900, // the shockwave's ripple out to the farthest mine
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
