import type { EventMeta } from "../../eventMeta";

// a giant magic circle drawn flat at the bottom of the frozen screen turns
// faster and faster; a pillar of light erupts out of it and rides up the
// building, a blast at every floor, until it bursts the locked floor open
export default {
  label: "Groundbreaking",
  style: "summon",
  reward: "free floors",
  chance: 0.01,
  values: {
    eruptMs: 1400, // from the click till the pillar erupts
    riseMs: 320, // the pillar riding up to the locked floor
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
