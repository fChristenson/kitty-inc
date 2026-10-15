import type { EventMeta } from "../../eventMeta";

// a wisp swings up the screen on lightning vines
export default {
  label: "Vine Swing",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    swingsMs: [440, 280] as [number, number], // each swing, quickening
    leapMs: 120,
    finalMs: 380,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
