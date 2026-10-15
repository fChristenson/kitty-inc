import type { EventMeta } from "../../eventMeta";

// a rally bouncing once on a bar every shot
export default {
  label: "Tennis",
  style: "bounce",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    serveMs: 200,
    legMs: [300, 170] as [number, number], // each leg, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
