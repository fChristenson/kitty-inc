import type { EventMeta } from "../../eventMeta";

// a beam strung between two whirling wisps traces a rosette
export default {
  label: "Spirograph",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    enterMs: 250, // the wisps flying out onto their rings
    whirlMs: 1_300, // whirling, ever faster
    collapseMs: 250, // spiralling into the middle
    levelShare: 0.04, // of each bar's levels, per sweep
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
