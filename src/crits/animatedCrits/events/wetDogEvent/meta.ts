import type { EventMeta } from "../../eventMeta";

// a soaked wisp shakes cash off like a wet dog
export default {
  label: "Wet Dog",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    soakMs: 500,
    firstMs: 280,
    shakesMs: [380, 240] as [number, number], // between shakes, quickening
    shakeMs: 260,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
