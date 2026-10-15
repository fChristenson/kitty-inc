import type { EventMeta } from "../../eventMeta";

// a gun shoots clay wisps out of the sky at the top of their arcs
export default {
  label: "Skeet",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    riseMs: 420, // a clay's climb to the top of its arc
    throwsMs: [260, 140] as [number, number], // between throws, quickening
    doubleGapMs: 200,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
