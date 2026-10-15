import type { EventMeta } from "../../eventMeta";

// spinning Fourier arms draw a heart in coins
export default {
  label: "Epicycles",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    drawMs: 1300, // the tip drawing the heart
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
