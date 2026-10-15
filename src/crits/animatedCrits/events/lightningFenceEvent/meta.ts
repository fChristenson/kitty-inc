import type { EventMeta } from "../../eventMeta";

// current races up a fence of posts to the locked floor
export default {
  label: "Lightning Fence",
  style: "lightning",
  reward: "unlock",
  chance: 0.01,
  values: {
    plantMs: 450, // the posts planting
    jumpsMs: [160, 70] as [number, number], // between jumps, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
