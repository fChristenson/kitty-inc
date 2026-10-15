import type { EventMeta } from "../../eventMeta";

// capsules ride tubes of cash onto empty spots
export default {
  label: "Pneumatic Tubes",
  style: "mix",
  reward: "free hires and cash",
  chance: 0.01,
  values: {
    firesMs: [260, 130] as [number, number], // between tubes, quickening
    travelMs: 520, // a capsule's trip down its tube
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
