import type { EventMeta } from "../../eventMeta";

// a bomber drops a stick of bombs across the screen
export default {
  label: "Carpet Bombing",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    flyMs: 1_100, // the bomber crossing
    fallMs: 380, // each bomb's fall
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
