import type { EventMeta } from "../../eventMeta";

// a thief wisp hops between laser tripwires, grabbing stashes
export default {
  label: "Tripwire",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    hopMs: 220, // each hop
    dwellMs: 120, // each grab
    alarmMs: 300, // the alarm going off
    escapeMs: 400, // the getaway into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
