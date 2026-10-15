import type { EventMeta } from "../../eventMeta";

// shots glance off a spinning bar of light onto the empty spots
export default {
  label: "Deflector",
  style: "gunfire",
  reward: "free hires",
  chance: 0.01,
  values: {
    fireMs: [220, 80] as [number, number], // between shots, quickening
    speed: 1.8, // px per ms
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
