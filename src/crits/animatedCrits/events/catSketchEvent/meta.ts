import type { EventMeta } from "../../eventMeta";

// bolts etch a cat's head in glitter over each empty spot, which drops in as
// a hire
export default {
  label: "Cat Sketch",
  style: "lightning",
  reward: "free hires",
  chance: 0.01,
  values: {
    strikeMs: 650, // one sketch's strikes (the first slower, the last quicker)
    blazeMs: 150, // a finished sketch blazing
    dropMs: 200, // the sketch dropping onto its spot
    gapMs: 60, // before the next sketch
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
