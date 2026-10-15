import type { EventMeta } from "../../eventMeta";

// the button is shaken and the cork pops, gushing cash
export default {
  label: "Pop the Cork",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    shakeMs: 450, // the shaking before the pop
    gushesMs: [240, 140] as [number, number], // between gushes, quickening
    travelMs: 420, // each gush's coins in flight
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
