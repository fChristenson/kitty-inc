import type { EventMeta } from "../../eventMeta";

// the screen is crumpled into a ball and burst
export default {
  label: "Crumple",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    crumpleMs: 280,
    trembleMs: 160,
    tossMs: 340,
    unfoldMs: 320,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
