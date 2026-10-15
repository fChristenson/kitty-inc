import type { EventMeta } from "../../eventMeta";

// moths spiral a flame, then fly to empty spots
export default {
  label: "Moths",
  style: "wisp",
  reward: "hires",
  chance: 0.01,
  values: {
    flareMs: 300, // the flame flaring up
    circleMs: 700, // the moths spiralling in
    gapsMs: [260, 120] as [number, number], // between moths darting off, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
