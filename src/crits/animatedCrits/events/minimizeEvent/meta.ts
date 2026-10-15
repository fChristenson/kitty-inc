import type { EventMeta } from "../../eventMeta";

// the screen is minimized into the total
export default {
  label: "Minimize",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    suckMs: 520,
    gapMs: 260,
    outMs: 340,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
