import type { EventMeta } from "../../eventMeta";

// a gunner fires both ways at once onto empty spots
export default {
  label: "Gun Kata",
  style: "gunfire",
  reward: "hires",
  chance: 0.01,
  values: {
    dartMs: 180, // each dart to a pose
    posesMs: [420, 260] as [number, number], // between poses, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
