import type { EventMeta } from "../../eventMeta";

// the screen tears into sliding interlaced lines
export default {
  label: "Interlace",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    joltsMs: [380, 300] as [number, number], // between jolts
    tornMs: 250, // held torn before snapping back
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
