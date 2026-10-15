import type { EventMeta } from "../../eventMeta";

// a glider wisp corkscrews up erupting columns of cash, then shoots into the
// total
export default {
  label: "Updraft",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    climbsMs: [650, 420] as [number, number], // each corkscrew up a column, quickening
    glideMs: 220, // gliding across to the next column
    diveMs: 240, // the dive into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
