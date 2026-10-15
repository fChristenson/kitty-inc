import type { EventMeta } from "../../eventMeta";

// a lightning sword heaved out of the button
export default {
  label: "Excalibur",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    firstMs: 300,
    heavesMs: [380, 220] as [number, number], // between heaves, quickening
    raiseMs: 220,
    levelShare: 0.04,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
