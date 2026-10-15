import type { CritMeta } from "../../../critKit/meta";

// two gold poles snapping the locked floor's dust into crusts, yanking
// together to slam it open, its new bar a gear up for good
export default {
  label: "Pull Up",
  chance: 0.03,
  style: "pull",
  values: {
    // the floor it opens this many times as fast for good
    speed: 2,
  },
} satisfies CritMeta;
