import type { EventMeta } from "../../eventMeta";

// beacons call new workers down from the sky
export default {
  label: "Beacons",
  style: "beam",
  reward: "hires",
  chance: 0.01,
  values: {
    gapsMs: [220, 110] as [number, number], // between beacons, quickening
    waitMs: 200, // before each wisp falls
    fallMs: 280, // each fall
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
