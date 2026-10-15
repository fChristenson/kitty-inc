import type { EventMeta } from "../../eventMeta";

// a kite wisp flies on a string of cash, snaps, dives
export default {
  label: "Kite",
  chance: 0.01,
  values: {
    riseMs: 400, // the kite rising off the button
    flyMs: 900, // the kite swooping
    flowMs: 600, // each coin's climb up the string
    diveMs: 380, // the kite diving into the total
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
