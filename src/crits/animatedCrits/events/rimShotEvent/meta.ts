import type { EventMeta } from "../../eventMeta";

// a wisp ricochets round a ring scoring a star
export default {
  label: "Rim Shot",
  style: "bounce",
  reward: "cash",
  chance: 0.01,
  values: {
    legsMs: [220, 80] as [number, number], // each chord, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
