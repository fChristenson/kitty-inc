import type { EventMeta } from "../../eventMeta";

// a racer chases a ghost lap round the button's end, overtakes it and dives
// onto the clicked bar
export default {
  label: "Time Trial",
  style: "race",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    raceMs: 1300, // the ghost's lap
    leadMs: 180, // the ghost's head start
    beatMs: 80, // how far ahead of the ghost the racer finishes
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
