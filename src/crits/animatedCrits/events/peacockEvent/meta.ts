import type { EventMeta } from "../../eventMeta";

// a fan of beams unfurls from the button and snaps shut on the clicked bar
export default {
  label: "Peacock",
  style: "beam",
  reward: "levels + a crit tier",
  chance: 0.01,
  values: {
    opensMs: [150, 70] as [number, number], // between ribs opening, quickening
    snapMs: 160, // each rib snapping open
    shimmerMs: 250, // the open fan shimmering
    shutMs: 180, // snapping shut onto the clicked bar
    levelShare: 0.05, // of each bar's levels, per rib
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
