import type { CritMeta } from "../../../critKit/meta";

// a row of coin fountain jets dancing up from the floor below the locked
// floor, wave after quickening wave pounding the lock from below, until every
// jet shoots up at once in one column that bursts it open; the coins rain
// down through the new floor's button onto the one below, leaving free taps
export default {
  label: "Dancing Waters",
  chance: 0.03,
  style: "money",
  // free taps on the upgrade button of the open floor below the opened one
  values: { taps: 8 },
} satisfies CritMeta;
