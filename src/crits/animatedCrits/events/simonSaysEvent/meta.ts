import type { EventMeta } from "../../eventMeta";

// four pads flash out a memory game
export default {
  label: "Simon Says",
  style: "experiment",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    lightMs: 300, // the pads lighting
    beatsMs: [230, 140] as [number, number], // each flash, quickening round by round
    roundGapMs: 250, // between rounds
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
