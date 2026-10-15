import type { EventMeta } from "../../eventMeta";

// the button shoots slugs of cash at wisps
export default {
  label: "Cash Cannon",
  chance: 0.01,
  values: {
    leadMs: 250, // the targets popping up before the first shot
    gapsMs: [330, 280, 230, 200], // between shots, quickening
    slugMs: 250, // each slug pouring
    travelMs: 380, // each coin's trip to its target
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
