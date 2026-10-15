import type { EventMeta } from "../../eventMeta";

// fountain jets of cash put on a show
export default {
  label: "Water Show",
  style: "money",
  chance: 0.01,
  values: {
    actMs: 520, // between acts
    streamMs: 380, // each jet pouring
    travelMs: 480, // each coin's arc
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
