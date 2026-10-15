import type { EventMeta } from "../../eventMeta";

// a bomber drops bombs a catcher catches
export default {
  label: "Kaboom",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    dropsMs: [220, 100] as [number, number], // between drops, quickening
    fallMs: 520,
    loadGapMs: 220, // before the whole load drops
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
