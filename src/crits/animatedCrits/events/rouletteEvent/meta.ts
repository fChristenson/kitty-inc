import type { EventMeta } from "../../eventMeta";

// the ball whips round a wheel of coin pockets
export default {
  label: "Roulette",
  chance: 0.01,
  values: {
    spinMs: 850, // whipping round the rim
    dropMs: 180, // dropping in toward the pockets
    hopMs: 110, // each clatter pocket to pocket
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
