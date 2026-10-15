import type { EventMeta } from "../../eventMeta";

// a tanker refuels wisps through hoses of cash, which break off onto the bars
export default {
  label: "Tanker",
  style: "mix",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    flyMs: 1900, // the tanker crossing the screen
    hoseMs: 260, // each coin's trip down a hose
    diveMs: 320, // each receiver's dive onto its bar
    levelShare: 0.05,
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
