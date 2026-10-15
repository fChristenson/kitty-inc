import type { EventMeta } from "../../eventMeta";

// sparks jump a gap across the locked floor
export default {
  label: "Spark Gap",
  style: "lightning",
  reward: "an unlock",
  chance: 0.01,
  values: {
    flyMs: 300, // the electrodes flying out
    sparksMs: 900, // the sparks, ever faster
    arcMs: 500, // the steady arc building
    holdMs: 300,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
