import type { EventMeta } from "../../eventMeta";

// a ball ricochets down a narrowing funnel, ever faster, onto the bar
export default {
  label: "Bottleneck",
  style: "bounce",
  reward: "levels",
  chance: 0.01,
  values: {
    legsMs: [260, 45] as [number, number], // each ricochet, quickening
    levelShare: 0.015, // per bounce
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
