import type { EventMeta } from "../../eventMeta";

// a diabolo is whipped, flung up and smashed onto each bar
export default {
  label: "Diabolo",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    whipsMs: [380, 220] as [number, number], // each whip, quickening
    upMs: 200,
    downMs: 160,
    levelShare: 0.04,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
