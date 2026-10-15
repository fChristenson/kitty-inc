import type { EventMeta } from "../../eventMeta";

// two beams cut the locked floor open
export default {
  label: "Breach",
  style: "beam",
  reward: "an unlock",
  chance: 0.01,
  values: {
    aimMs: 300, // the aim lasers flickering
    cutMs: 1_200, // the beams cutting round, speeding up
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
