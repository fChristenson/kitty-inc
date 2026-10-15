import type { EventMeta } from "../../eventMeta";

// the floors shrink away into space under one giant boss, three rings of
// wisps round a core, each ring firing its own pattern while the player's
// wisp peels it off in a rolling chain of blasts; the bare core charges and
// fires a beam the wisp swerves from, then the wisp's beam blows it apart;
// back on the floors every bar in view takes a crit tier up
export default {
  label: "Boss Rush",
  style: "shmup",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    enterMs: 450, // the view lifting off the floors
    flyMs: 5400, // the fight, until the floors rush up
    tierGapMs: 80, // between the bars' crit tiers, top to bottom
  },
} as const satisfies EventMeta;
