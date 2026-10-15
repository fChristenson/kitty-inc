import type { EventMeta } from "../../eventMeta";

// small magic circles on every open floor's ground turning in lockstep, then
// sliding up the building merging one by one into a giant circle under the
// locked floor, whose pillar of light bursts the floor open
export default {
  label: "Convergence",
  style: "summon",
  reward: "free floors",
  chance: 0.01,
  values: {
    firstMs: 120, // from the click till the circles are drawn
    gatherMs: 900, // the circles turning in place, till they lift off
    stepMs: 160, // each slide up to the next circle
    whipMs: 420, // the giant circle whipping round before the pillar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
