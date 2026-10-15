import type { EventMeta } from "../../eventMeta";

// a tower of spark gaps fires gap by gap up the screen, then dumps one
// colossal bolt onto the clicked bar
export default {
  label: "Marx Generator",
  style: "lightning",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    chargeMs: 380, // the electrodes popping in, bottom to top
    fireMs: 1150, // every gap firing up the tower, quickening
    dischargeMs: 220, // the top gap to the colossal bolt
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
