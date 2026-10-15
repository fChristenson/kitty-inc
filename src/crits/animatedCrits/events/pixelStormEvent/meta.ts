import type { EventMeta } from "../../eventMeta";

// the screen shatters into swirling tiles
export default {
  label: "Pixel Storm",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    swirlMs: 600, // the tiles whirling
    rowGapMs: 35, // between rows landing back
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
