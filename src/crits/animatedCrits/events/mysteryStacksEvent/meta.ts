import type { EventMeta } from "../../eventMeta";

// every bar in view flips over into a gold mystery bar with a ? on it; one by
// one, quick-fire, the ?s flip round onto the crit's number; beams join them
// all and every bar blows into its levels, the clicked one a crit tier up
export default {
  label: "Mystery Stacks",
  style: "explosion",
  reward: "levels + crit tier",
  chance: 0.01,
  values: {
    flipMs: 240, // each bar flipping over into its gold bar
    firstRevealMs: 700, // the first ? turning round
    revealGapMs: 220, // between the ?s turning, top to bottom
    revealMs: 160, // a ? turning round onto the number
    linkMs: 120, // from the last turning to the beams joining them
    levelShare: 0.006, // levels per bar as its run blows
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
