import type { EventMeta } from "../../eventMeta";

// a giant planet's resonances sweep bands out of an asteroid belt into wisps
// that drop onto the empty spots
export default {
  label: "Kirkwood Gaps",
  style: "galaxy",
  reward: "free hires",
  chance: 0.01,
  values: {
    growMs: 250, // the belt swirling up
    firstMs: 300, // before the first gap opens
    gapMs: 260, // between gaps opening
    sweepMs: 450, // a band's asteroids gathering into a wisp
    dropMs: 380, // each wisp's arc onto its spot
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
