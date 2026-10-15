import type { EventMeta } from "../../eventMeta";

// wisps waltz in pairs, throwing coins on every beat
export default {
  label: "Waltz",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    enterMs: 300, // the pairs whirling in
    danceMs: 1_300, // the dance, ever faster
    gatherMs: 350, // the pairs gathering for the finale
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
