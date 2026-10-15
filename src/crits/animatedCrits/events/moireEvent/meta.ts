import type { EventMeta } from "../../eventMeta";

// two fans of beams swing through each other in moiré, then lock onto the
// clicked bar
export default {
  label: "Moiré",
  style: "beam",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    growMs: 220, // the fans blazing up
    sweepMs: 1500, // swinging and closing in
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
