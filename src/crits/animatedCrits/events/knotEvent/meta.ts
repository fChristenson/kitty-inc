import type { EventMeta } from "../../eventMeta";

// a river ties itself in ever tighter knots
export default {
  label: "Knot",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    knotsMs: [700, 420] as [number, number], // each knot, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
