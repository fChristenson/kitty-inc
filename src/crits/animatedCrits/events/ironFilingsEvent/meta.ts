import type { EventMeta } from "../../eventMeta";

// the clicked bar turns into a bar magnet, its field dragging filings in arcs
// onto its poles
export default {
  label: "Iron Filings",
  style: "clutter",
  reward: "levels",
  chance: 0.01,
  values: {
    sprinkleMs: 350, // the filings sprinkled over the screen
    pullMs: 1200, // the field's pulses dragging them onto the poles
    slamMs: 260, // the two heaps slamming into the bar's middle
    levelShare: 0.03, // levels landed
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
