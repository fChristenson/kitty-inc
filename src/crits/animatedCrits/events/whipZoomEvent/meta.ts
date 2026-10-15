import type { EventMeta } from "../../eventMeta";

// batch 31 experiments: the whole screen is the effect experiment, crit
// tiers: src/crits/animatedCrits/events/whipZoomEvent: the camera whips onto
// each bar
export default {
  label: "Whip Zoom",
  chance: 0.01,
  values: {
    whipMs: 160, // each whip in
    holdsMs: [360, 200] as [number, number], // on each bar, quickening
    outMs: 260, // the pull back out
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
