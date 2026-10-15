import type { EventMeta } from "../../eventMeta";

// a funnel of glitter touches down at the bottom corner of the frozen screen
// and swells up the whole building, its foot tearing across the screen and
// back, quicker each way, tearing the glitter off every bar it sweeps
// (levels); it whips round under the clicked bar and flings it all back down
// onto the bars (levels), collapsing in a huge blast
export default {
  label: "Tornado Alley",
  style: "tornado",
  reward: "levels",
  chance: 0.01,
  values: {
    firstMs: 250, // from the click till it touches down
    sweepMs: 1300, // its foot's run across the screen and back, quickening
    whipMs: 250, // whipping round flat out under the clicked bar
    flingMs: 300, // the glitter flung back down onto the bars
    flingGapMs: 50, // between the bars' glitter landing, top first, the clicked one last
    levelShare: 0.03, // per bar, as it's swept and as its glitter lands
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
