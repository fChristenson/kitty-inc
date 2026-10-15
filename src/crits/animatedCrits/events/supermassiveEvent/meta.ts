import type { EventMeta } from "../../eventMeta";

// a tiny blazing star ignites in the middle of the frozen screen and tears
// the light off every bar in view, curling streaks spiralling in, a trickle
// then a flood, each bar flashing a crit tier up as its light gushes off; the
// star swells into a huge throbbing sun, corona flaring, collapses to a white
// pinpoint, a beat of silence, then bursts in a ring of light slamming across
// every bar, the last crit tiers
export default {
  label: "Supermassive",
  style: "pull",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    firstMs: 100, // from the click till the star ignites
    pullMs: 1150, // the pull, till the last streak is swallowed
    collapseMs: 150, // the sun collapsing to a pinpoint
    silenceMs: 130, // the pinpoint hanging in silence before the blast
    ringMs: 260, // the blast's ring crossing the screen
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
