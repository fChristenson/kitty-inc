import type { EventMeta } from "../../eventMeta";

// a wisp wall-jumps up the screen kicking off the bars
export default {
  label: "Wall Jump",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    jumpsMs: [380, 240] as [number, number], // each jump, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
