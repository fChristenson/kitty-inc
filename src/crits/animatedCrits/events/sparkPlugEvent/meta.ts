import type { EventMeta } from "../../eventMeta";

// spark plug wisps fire sparks onto empty spots
export default {
  label: "Spark Plug",
  style: "lightning",
  reward: "hires",
  chance: 0.01,
  values: {
    flyMs: 350, // the plugs flying out
    firesMs: [280, 140] as [number, number], // between sparks, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
