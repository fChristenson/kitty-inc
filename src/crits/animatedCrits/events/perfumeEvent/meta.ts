import type { EventMeta } from "../../eventMeta";

// a perfume atomizer mists each floor gold till a worker's hired on it
export default {
  label: "Perfume",
  style: "spray",
  reward: "hires",
  chance: 0.01,
  values: {
    swingMs: 280, // the bottle swinging in
    squeezeMs: [340, 170] as [number, number], // each floor's squeeze, quickening
    windUpMs: 380, // the bulb swelling before the last squeeze
    burstMs: 260, // the last squeeze misting every floor
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
