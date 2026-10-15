import type { EventMeta } from "../../eventMeta";

// a bolt ricochets round the screen
export default {
  label: "Bolt Bounce",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    legsMs: [220, 90] as [number, number], // each leg, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
