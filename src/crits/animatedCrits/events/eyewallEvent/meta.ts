import type { EventMeta } from "../../eventMeta";

// lightning strikes a whirling eyewall as it tightens onto the clicked bar
export default {
  label: "Eyewall",
  style: "lightning",
  reward: "levels and a crit tier",
  chance: 0.01,
  values: {
    spinMs: 300, // the wall spinning up
    gapMs: [190, 60] as [number, number], // between strikes, quickening
    levelShare: 0.008, // levels per strike on a bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
