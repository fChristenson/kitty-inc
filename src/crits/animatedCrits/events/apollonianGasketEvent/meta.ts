import type { EventMeta } from "../../eventMeta";

// circles pack every gap in a ring of light, then fly onto the bars
export default {
  label: "Apollonian Gasket",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    growMs: 1500, // every circle popping in, biggest first, quickening
    blazeMs: 260, // the finished gasket blazing
    collapseMs: 220, // collapsing into a wisp
    flyMs: 300, // each wisp's arc onto its bar
    gapMs: 90, // between wisps
    levelShare: 0.04, // levels per bar (twice on the clicked one)
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
