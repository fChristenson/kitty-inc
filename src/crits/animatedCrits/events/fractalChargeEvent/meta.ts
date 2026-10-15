import type { EventMeta } from "../../eventMeta";

// bombs split down Sierpinski's triangle, 1, 3, 9, 27
export default {
  label: "Fractal Charge",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    lobMs: 420, // the first bomb lobbed into the middle
    flyMs: [300, 250, 220] as number[], // each later generation's throw
    fuseMs: [320, 220, 170, 150] as number[], // each generation's fuse once landed
    levelShare: 0.03, // levels per generation on each bar it reaches
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
