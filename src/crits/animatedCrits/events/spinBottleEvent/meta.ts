import type { EventMeta } from "../../eventMeta";

// a spinning pointer picks bars
export default {
  label: "Spin the Bottle",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    gatherMs: 300, // the pointer forming
    spinsMs: [520, 320] as [number, number], // each spin, quickening
    levelShare: 0.06, // of the bar's levels, per spin
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
