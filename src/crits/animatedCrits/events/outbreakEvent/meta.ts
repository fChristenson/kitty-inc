import type { EventMeta } from "../../eventMeta";

// a small twister touches down on every bar of the frozen screen and tears
// along it (levels), then they all race down to one spot and swell into a
// giant funnel that whips round and flings everything back onto the bars
// (levels), collapsing in a huge blast
export default {
  label: "Outbreak",
  style: "tornado",
  reward: "levels",
  chance: 0.01,
  values: {
    firstMs: 220, // from the click till the first twister touches down
    touchGapMs: 60, // between the twisters touching down, top first
    runMs: 480, // a twister's run along its bar, quickening
    driftMs: 260, // its race down to the meeting spot
    whipMs: 450, // the giant whipping round flat out
    flingMs: 300, // the glitter flung back onto the bars
    flingGapMs: 50, // between the bars' glitter landing, top first, the clicked one last
    levelShare: 0.03, // per bar, as its twister rips into it and as its glitter lands
    holdMs: 500,
    mergeMs: 0,
  },
  isNew: true,
} as const satisfies EventMeta;
