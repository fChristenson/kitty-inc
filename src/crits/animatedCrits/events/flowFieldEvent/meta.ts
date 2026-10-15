import type { EventMeta } from "../../eventMeta";

// coins ride a swirling flow field in streams and eddies, then pour into the
// total
export default {
  label: "Flow Field",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    scatterMs: 300, // the coins scattering over the screen
    flowMs: 1100, // riding the field
    pourMs: 600, // the field bending into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
