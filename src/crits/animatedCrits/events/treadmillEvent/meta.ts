import type { EventMeta } from "../../eventMeta";

// the screen scrolls like a treadmill
export default {
  label: "Treadmill",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    runMs: 1600,
    laps: 4, // screens scrolled past
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
