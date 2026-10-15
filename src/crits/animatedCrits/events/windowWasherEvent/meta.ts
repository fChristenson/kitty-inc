import type { EventMeta } from "../../eventMeta";

// a window washer's platform drops bar to bar, misting each gold and
// squeegeeing it clean for levels
export default {
  label: "Window Washer",
  style: "spray",
  reward: "levels",
  chance: 0.01,
  values: {
    enterMs: 300, // the platform dropping in
    sprayMs: 300, // misting a bar back and forth
    wipeMs: 140, // the squeegee stroke
    dropMs: 120, // dropping to the next bar
    levelShare: 0.03, // levels per bar washed
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
