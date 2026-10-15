import type { EventMeta } from "../../eventMeta";

// two wisps jump-start the screen in surges of sparks
export default {
  label: "Jumper Cables",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    surgesMs: [340, 170] as [number, number], // between surges, quickening
    slamMs: 300, // the final jolt
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
