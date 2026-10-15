import type { EventMeta } from "../../eventMeta";

// a nozzle mists the screen in gold, then lightning crawls through the haze
// and sets it off in a rolling wave of blasts
export default {
  label: "Ion Haze",
  style: "spray + lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    sprayMs: 800, // the nozzle's sweep down the screen
    strikeLagMs: 250, // the pause before the bolt strikes the haze
    levelShare: 0.01, // levels per bar the lightning reaches
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
