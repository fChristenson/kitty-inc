import type { EventMeta } from "../../eventMeta";

// candle flames blown out by a gust
export default {
  label: "Birthday Candles",
  style: "wisp",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    lightMs: 110, // between candles lighting
    flameMs: 250, // the flames flickering before the gust
    gustMs: 520, // the gust crossing the screen
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
