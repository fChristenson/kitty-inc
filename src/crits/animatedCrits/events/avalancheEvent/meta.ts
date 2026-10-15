import type { EventMeta } from "../../eventMeta";

// a torrent of cash roars down the screen, burying the bars
export default {
  label: "Avalanche",
  style: "money",
  reward: "cash + levels",
  chance: 0.01,
  values: {
    streamMs: 900, // the cash breaking loose
    fallMs: 700, // each coin's slide down
    drainMs: 300, // the heap setting off for the total
    flightMs: 420, // each coin's flight into the total
    levelShare: 0.1, // of each bar's levels
    holdMs: 200,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
