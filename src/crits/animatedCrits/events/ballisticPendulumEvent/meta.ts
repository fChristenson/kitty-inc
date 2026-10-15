import type { EventMeta } from "../../eventMeta";

// shot bobs swing up into the bars
export default {
  label: "Ballistic Pendulum",
  style: "gunfire",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    firstMs: 400,
    shotsMs: [420, 260] as [number, number], // between shots, quickening
    aimMs: 200,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
