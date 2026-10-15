import type { EventMeta } from "../../eventMeta";

// a wisp skis a river of cash off a jump
export default {
  label: "Ski Jump",
  style: "mix",
  chance: 0.01,
  values: {
    streamMs: 900, // the river pouring
    travelMs: 1_400, // the skier's (and each coin's) run, jump and landing
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
