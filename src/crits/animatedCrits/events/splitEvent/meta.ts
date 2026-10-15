import type { EventMeta } from "../../eventMeta";

// the screen splits open, then slams shut
export default {
  label: "Split",
  style: "experiment",
  chance: 0.01,
  values: {
    crackMs: 300, // the crack zipping across
    openMs: 260, // the halves heaving apart
    gushMs: 700, // cash gushing out of the gap
    slamMs: 120, // slamming back together
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
