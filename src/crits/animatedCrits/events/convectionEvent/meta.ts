import type { EventMeta } from "../../eventMeta";

// jittering glitter organises into convection rolls whose hot plumes erupt
// onto the workers
export default {
  label: "Convection",
  style: "experiment",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    settleMs: 350, // the glitter jittering at random
    boilMs: 1100, // the rolls setting in and quickening
    gapMs: 90, // between workers' streams
    dropMs: 400, // each grain's arc onto its worker
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
