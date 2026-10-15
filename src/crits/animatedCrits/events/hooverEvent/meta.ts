import type { EventMeta } from "../../eventMeta";

// a vacuum wisp slurps up puddles of cash
export default {
  label: "Hoover",
  chance: 0.01,
  values: {
    gapMs: 110, // between jets
    jetMs: 250, // each jet gushing
    flyMs: 380, // each coin's arc into its puddle
    leadMs: 450, // before the vacuum sets off
    vacuumMs: 1_400, // the vacuum's run, puddles to total
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
