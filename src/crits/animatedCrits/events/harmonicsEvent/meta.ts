import type { EventMeta } from "../../eventMeta";

// a string of light hums up through its harmonics, then each loop flings a
// piece onto an empty spot
export default {
  label: "Harmonics",
  style: "experiment",
  reward: "free hires",
  chance: 0.01,
  values: {
    growMs: 250, // the string stretching out
    modeMs: 380, // each harmonic, quickening
    gapMs: 90, // between pieces flung off
    dropMs: 380, // each piece's arc onto its spot
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
