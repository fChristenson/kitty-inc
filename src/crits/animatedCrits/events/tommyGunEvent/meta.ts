import type { EventMeta } from "../../eventMeta";

// a tommy gun sprays the screen
export default {
  label: "Tommy Gun",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    riseMs: 300, // the gun rising
    sprayMs: 1_500, // the spray, ever faster
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
