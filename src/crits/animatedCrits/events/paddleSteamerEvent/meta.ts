import type { EventMeta } from "../../eventMeta";

// a paddle wheel flings arcs of cash
export default {
  label: "Paddle Steamer",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    crossMs: 1500, // the wheel's roll across, spinning faster
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
