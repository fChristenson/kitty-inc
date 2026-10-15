import type { EventMeta } from "../../eventMeta";

// plugholes over the empty spots drain the screen's glitter and drop it in as
// hires
export default {
  label: "Plugholes",
  style: "clutter",
  reward: "free hires",
  chance: 0.01,
  values: {
    spillMs: 450, // the glitter whirling out over the screen
    openGapMs: 160, // between holes opening
    drainMs: 1300, // the holes draining the screen, gulp by gulp
    popMs: 260, // each heap dropping into its spot
    popGapMs: 110,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
