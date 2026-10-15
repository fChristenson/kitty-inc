import type { EventMeta } from "../../eventMeta";

// the screen blows up like a balloon and pops
export default {
  label: "Inflate",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    breathMs: 360,
    poppedMs: 280,
    backMs: 300,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
