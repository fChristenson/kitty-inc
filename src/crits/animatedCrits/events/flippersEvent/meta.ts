import type { EventMeta } from "../../eventMeta";

// beam flippers rally a wisp ball up the screen
export default {
  label: "Flippers",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    dropMs: 320,
    shotsMs: [400, 220] as [number, number], // each shot up and back, quickening
    finalMs: 380,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
