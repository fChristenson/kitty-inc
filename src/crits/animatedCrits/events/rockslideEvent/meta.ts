import type { EventMeta } from "../../eventMeta";

// bombs bound down the bars like boulders
export default {
  label: "Rockslide",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    tumblesMs: [200, 120] as [number, number], // between bombs setting off
    legsMs: [300, 180] as [number, number], // each hop, quickening as they fall
    levelShare: 0.01, // per bounce
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
