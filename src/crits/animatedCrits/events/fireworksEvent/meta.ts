import type { EventMeta } from "../../eventMeta";

// rocket wisps burst into rings of stars
export default {
  label: "Fireworks",
  style: "wisp",
  chance: 0.01,
  values: {
    gapMs: 300, // between launches
    riseMs: 380, // each shell rising
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
