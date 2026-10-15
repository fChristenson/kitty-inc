import type { EventMeta } from "../../eventMeta";

// 3, 2, 1, GO! slams, then a geyser
export default {
  label: "Countdown",
  style: "experiment",
  chance: 0.01,
  values: {
    beatMs: 380, // between slams
    streamMs: 450, // the geyser pouring
    travelMs: 550, // each coin's trip up it
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
