import type { EventMeta } from "../../eventMeta";

// a bolt skewers balls of cash that blow down it
export default {
  label: "Skewer",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    gatherGapMs: 90,
    cookMs: 380, // crackling on the bolt
    popsMs: [200, 120] as [number, number], // between pops, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
