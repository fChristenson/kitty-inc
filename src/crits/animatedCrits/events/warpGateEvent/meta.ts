import type { EventMeta } from "../../eventMeta";

// twin rings over the locked floor and at the bottom of the frozen screen;
// wisps fall down through them in loops, faster each time, more joining,
// until their last falls slam the locked floor open
export default {
  label: "Warp Gate",
  style: "portal",
  reward: "free floors",
  chance: 0.01,
  values: {
    firstMs: 380, // from the click till the first wisp falls
    loopsMs: [560, 420, 320, 250], // each loop's fall, quickening
    slamMs: 140, // the last fall into the locked floor
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
