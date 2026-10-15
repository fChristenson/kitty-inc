import type { EventMeta } from "../../eventMeta";

// a drill curves in sideways, grinds along inside the clicked bar, then it
// fractures in a chain of blasts
export default {
  label: "Fracking",
  style: "drill",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    curveMs: 380, // screaming down and round into the bar's end
    stallMs: 700, // grinding in place on the bite
    boreMs: 1500, // boring along inside the bar
    fractureMs: 90, // between the fracture blasts
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
