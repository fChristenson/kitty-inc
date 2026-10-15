import type { EventMeta } from "../../eventMeta";

// two hands juggle rivers of cash, then hurl them onto the bars
export default {
  label: "River Juggler",
  style: "mix",
  reward: "crit tiers and cash",
  chance: 0.01,
  values: {
    throwsMs: [200, 110] as [number, number], // between throws, quickening
    flightMs: 360, // each river's flight
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
