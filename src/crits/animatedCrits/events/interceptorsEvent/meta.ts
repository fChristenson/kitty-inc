import type { EventMeta } from "../../eventMeta";

// interceptor blasts catch falling missiles
export default {
  label: "Interceptors",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    wavesMs: [560, 420] as [number, number], // between waves, quickening
    fallMs: 700, // each missile's fall
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
