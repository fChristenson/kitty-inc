import type { EventMeta } from "../../eventMeta";

// a lander touches down on the locked floor
export default {
  label: "Lunar Lander",
  style: "wisp",
  reward: "unlock",
  chance: 0.01,
  values: {
    launchMs: 500, // the launch up and over
    descentMs: 1_000, // the descent onto the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
