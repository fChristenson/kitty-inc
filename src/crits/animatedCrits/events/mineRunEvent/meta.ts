import type { EventMeta } from "../../eventMeta";

// the floors' screen drops away under a mine cart racing down a timbered
// tunnel, imps dropped as it rattles past, a big one on the rails; it bursts
// out of the mouth onto the floors, every bar in view taking a crit tier
export default {
  label: "Mine Run",
  style: "fps",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    dropMs: 300, // the floors' screen dropping away
    rideMs: 2500, // the ride, until the mouth's close
    flyMs: 150, // the rush at the mouth, before the landing
    tierGapMs: 70, // between the bars' crit tiers, top to bottom
  },
} as const satisfies EventMeta;
