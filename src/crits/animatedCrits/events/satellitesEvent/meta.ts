import type { EventMeta } from "../../eventMeta";

// wisps skim the bars into orbit
export default {
  label: "Satellites",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    launchGapsMs: [300, 160] as [number, number], // between launches, quickening
    approachMs: 420, // each one's run in through its bar to its ring
    circleMs: 400, // all of them circling
    collapseMs: 300, // the orbits decaying onto the button
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
