import type { EventMeta } from "../../eventMeta";

// a beam lifts a spiral of cash up
export default {
  label: "Tractor Beam",
  style: "beam",
  chance: 0.01,
  values: {
    aimMs: 260, // the beam flickering down
    openMs: 220, // blazing open
    liftMs: 900, // coins being lifted off the button
    riseMs: 550, // each coin's spiral up
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
