import type { EventMeta } from "../../eventMeta";

// a huge bomb blows, sucks its blast back in and blows bigger, twice
export default {
  label: "Hiccups",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    fuseMs: 450, // the bomb fizzing before its first blast
    outMs: 260, // each hiccup's blast
    inMs: 200, // sucked back in
    pauseMs: 90, // swollen, before the next
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
