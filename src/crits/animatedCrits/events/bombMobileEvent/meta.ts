import type { EventMeta } from "../../eventMeta";

// a turning mobile of lit bombs blows tier by tier, then its giant drops onto
// the clicked bar
export default {
  label: "Bomb Mobile",
  style: "explosion",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    dropMs: 300, // the mobile dropping in
    spinMs: 450, // turning faster, fuses blinking quicker
    tipGapMs: 110, // between the four tip bombs
    midGapMs: 160, // between the two big bombs
    fallMs: 260, // the giant's drop onto the bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
