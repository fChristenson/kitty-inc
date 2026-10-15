import type { EventMeta } from "../../eventMeta";

// three-pronged bolts fork into the bars
export default {
  label: "Pitchfork",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    leadMs: 350, // the wisp leading in
    roundsMs: [400, 220] as [number, number], // each round, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
