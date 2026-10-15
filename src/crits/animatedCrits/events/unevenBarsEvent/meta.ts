import type { EventMeta } from "../../eventMeta";

// a gymnast swings bar to bar
export default {
  label: "Uneven Bars",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    swingsMs: [420, 260] as [number, number], // each bar's giant circles, quickening
    flightsMs: [320, 220] as [number, number], // each release, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
