import type { EventMeta } from "../../eventMeta";

// the button blinks morse at the bars
export default {
  label: "Morse Code",
  style: "experiment",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    riseMs: 250, // the signal rising
    dotsMs: [75, 50] as [number, number], // each dot, quickening letter by letter
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
