import type { EventMeta } from "../../eventMeta";

// a galaxy drains into its core, which fires twin jets, one onto the clicked
// bar
export default {
  label: "Quasar",
  style: "galaxy",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    growMs: 250, // the galaxy swirling up
    feedMs: 1200, // its stars spiralling into the core
    jetMs: 150, // the jets reaching out
    blazeMs: 350, // the jets blazing on
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
