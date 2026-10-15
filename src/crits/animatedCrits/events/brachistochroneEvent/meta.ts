import type { EventMeta } from "../../eventMeta";

// wisps race down a ramp, a drop and a cycloid onto the clicked bar
export default {
  label: "Brachistochrone",
  style: "experiment",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    growMs: 300, // the tracks snapping in
    raceMs: 1400, // the slowest wisp's run
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
