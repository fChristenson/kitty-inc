import type { EventMeta } from "../../eventMeta";

// bouncing grenades blow new workers onto empty spots
export default {
  label: "Grenade Toss",
  style: "explosion",
  reward: "hires",
  chance: 0.01,
  values: {
    gapsMs: [300, 160] as [number, number], // between throws, quickening
    throwMs: 650, // each throw and its bounces
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
