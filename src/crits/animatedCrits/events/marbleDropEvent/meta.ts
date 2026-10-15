import type { EventMeta } from "../../eventMeta";

// rods pulled from a nest drop marbles onto empty spots
export default {
  label: "Marble Drop",
  style: "experiment",
  reward: "hires",
  chance: 0.01,
  values: {
    fillMs: 450, // the nest filling
    pullsMs: [320, 200] as [number, number], // between pulls, quickening
    dropMs: 450, // each marble's bounce down
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
