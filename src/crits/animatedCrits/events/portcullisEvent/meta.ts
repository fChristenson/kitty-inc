import type { EventMeta } from "../../eventMeta";

// a gate of light slams down
export default {
  label: "Portcullis",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    postsMs: [150, 70] as [number, number], // between posts, quickening
    crossesMs: [220, 120] as [number, number], // between crossbars, quickening
    levelShare: 0.05, // of the bar's levels, per crossbar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
