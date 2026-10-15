import type { EventMeta } from "../../eventMeta";

// a grid of coins iterated z² + c, escapees peeling off into the total until
// the Mandelbrot set stands
export default {
  label: "Mandelbrot",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    fillMs: 450, // the grid of coins fanning up out of the button
    iterMs: 1150, // the escapes, step by step
    flyMs: 500, // each escapee's flight into the total
    surgeMs: 350, // the set surging into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
