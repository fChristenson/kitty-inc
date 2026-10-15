import type { EventMeta } from "../../eventMeta";

// a knight wisp hops in Ls onto empty spots
export default {
  label: "Knight's Tour",
  style: "experiment",
  reward: "hires",
  chance: 0.01,
  values: {
    legsMs: [220, 130] as [number, number], // each leg of a move, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
