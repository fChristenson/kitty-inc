import type { EventMeta } from "../../eventMeta";

// a ball bounces round inside a spinning hexagon
export default {
  label: "Spinning Hexagon",
  style: "bounce",
  reward: "cash",
  chance: 0.01,
  values: {
    spinMs: 1700, // the hexagon spinning up till it bursts
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
