import type { EventMeta } from "../../eventMeta";

// a wisp closes a ring of cash, which spins in
export default {
  label: "Ouroboros",
  style: "mix",
  chance: 0.01,
  values: {
    ringMs: 600, // the head running the first lap
    spinMs: 800, // the ring spinning up and shrinking
    collapseMs: 350, // collapsing into the total
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
