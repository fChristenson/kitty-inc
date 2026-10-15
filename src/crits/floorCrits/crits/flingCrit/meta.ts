import type { CritMeta } from "../../../critKit/meta";

// twin rings over and under the bars: the number falls through every bar,
// into the bottom ring and out of the top one, faster each fall, then shoots
// out of the top ring turned sideways flat along its own bar
export default {
  label: "Fling",
  chance: 0.03,
  style: "portal",
  isNew: true,
} satisfies CritMeta;
