import type { EventMeta } from "../../eventMeta";

// a gun shoots down sliding targets over the empty spots
export default {
  label: "Shooting Gallery",
  style: "gunfire",
  reward: "hires",
  chance: 0.01,
  values: {
    popMs: 250, // the targets popping up
    burstsMs: [300, 160] as [number, number], // before each burst, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
