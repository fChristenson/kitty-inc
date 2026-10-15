import type { EventMeta } from "../../eventMeta";

// a fog of random dots denoises step by step into a giant crown, which pours
// into the total
export default {
  label: "Denoise",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    fogMs: 200, // the noise fading in
    stepsMs: 1300, // every denoising step, quickening
    blazeMs: 220, // the finished crown blazing
    flightMs: 450, // each dot's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
