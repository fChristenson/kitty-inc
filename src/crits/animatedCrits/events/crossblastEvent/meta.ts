import type { EventMeta } from "../../eventMeta";

// bombs blow crosses of blasts onto empty spots
export default {
  label: "Crossblast",
  style: "explosion",
  reward: "hires",
  chance: 0.01,
  values: {
    dropsMs: [380, 220] as [number, number], // between bombs, quickening
    fallMs: 280, // each bomb's fall
    fuseMs: 300, // each fuse
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
