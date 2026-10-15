import type { EventMeta } from "../../eventMeta";

// a sharpshooter puts every shot through one spot
export default {
  label: "Tight Group",
  style: "gunfire",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    firstMs: 200,
    shotGapMs: [90, 50] as [number, number], // between shots in a group, quickening
    groupsMs: [620, 400] as [number, number], // between groups, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
