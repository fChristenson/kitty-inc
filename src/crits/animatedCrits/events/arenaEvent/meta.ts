import type { EventMeta } from "../../eventMeta";

// the view dives into a walled pit, imps teleporting in on pads and dropped
// as it strafes, a champion last, each kill a gold wisp; flung back up, the
// wisps rain onto the bars as levels
export default {
  label: "Arena",
  style: "fps",
  reward: "levels",
  chance: 0.01,
  values: {
    diveMs: 300, // diving through the floors' screen
    riseMs: 320, // flung up out of the pit as the floors drop back in
    flyMs: 300, // the wisps raining on the bars, before the landing
    levelShare: 0.02, // levels per imp's wisp
    champLevelShare: 0.06, // levels for the champion's wisp
  },
} as const satisfies EventMeta;
