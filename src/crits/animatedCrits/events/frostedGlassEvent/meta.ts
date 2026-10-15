import type { EventMeta } from "../../eventMeta";

// a wisp wipes through a frosted screen
export default {
  label: "Frosted Glass",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    frostMs: 250,
    wipeMs: 1500,
    blowMs: 220,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
