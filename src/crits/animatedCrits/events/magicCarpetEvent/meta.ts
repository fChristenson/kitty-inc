import type { EventMeta } from "../../eventMeta";

// a wisp rides a rippling carpet of cash round the screen
export default {
  label: "Magic Carpet",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    unrollMs: 300, // the carpet unrolling under the rider
    flyMs: 1_500, // swooping round, picking up speed
    pileMs: 400, // the carpet piling into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
