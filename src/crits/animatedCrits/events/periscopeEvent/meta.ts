import type { EventMeta } from "../../eventMeta";

// a beam bounces up a zigzag of mirror wisps, then the top one sends it down
// onto the clicked bar
export default {
  label: "Periscope",
  style: "beam",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    growMs: 250, // the mirrors popping up
    legMs: 240, // the beam's run to the next mirror, quickening
    finalMs: 260, // the last run down onto the bar
    blazeMs: 350, // the beam blazing on the bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
