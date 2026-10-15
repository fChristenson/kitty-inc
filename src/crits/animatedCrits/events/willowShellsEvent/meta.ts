import type { EventMeta } from "../../eventMeta";

// shells burst into willow bomblets onto empty spots
export default {
  label: "Willow Shells",
  style: "explosion",
  reward: "hires",
  chance: 0.01,
  values: {
    gapsMs: [300, 200] as [number, number], // between shells, quickening
    riseMs: 350, // each shell's rise
    droopMs: 450, // each bomblet's droop
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
