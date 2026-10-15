import type { EventMeta } from "../../eventMeta";

// the button shoots a hydra's heads off, two sprouting for each, then a burst
// takes the last four onto the empty spots
export default {
  label: "Hydra",
  style: "gunfire",
  reward: "free hires",
  chance: 0.01,
  values: {
    growMs: 250, // the hydra rearing up
    gapMs: 190, // between shots
    sproutMs: 160, // two new heads sprouting
    volleyGapMs: 45, // between the last burst's shots
    dropMs: 380, // a severed head's arc onto its spot
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
