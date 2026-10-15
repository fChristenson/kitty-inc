import type { EventMeta } from "../../eventMeta";

// a branching tree of lightning grows down onto the bars
export default {
  label: "Lichtenberg",
  style: "lightning",
  reward: "levels + tier",
  chance: 0.01,
  values: {
    limbsMs: [360, 150] as [number, number], // each trunk step and its branch
    dischargeMs: 320, // the whole tree blazing at once
    levelShare: 0.1, // of each bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
