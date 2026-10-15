import type { EventMeta } from "../../eventMeta";

// a swinging jet of cash sweeps across the bars
export default {
  label: "Pendulum Pour",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    swingsMs: [520, 360] as [number, number], // each swing, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
