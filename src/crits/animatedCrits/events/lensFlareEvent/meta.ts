import type { EventMeta } from "../../eventMeta";

// a lens flare's ghosts sweep over the bars
export default {
  label: "Lens Flare",
  style: "beam",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    riseMs: 250, // the flare blazing up
    slideMs: 1_500, // the sun sliding down, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
