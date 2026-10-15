import type { CritMeta } from "../../../critKit/meta";

// a drill boring into every button, each tap of it then costing half
export default {
  label: "Half Off",
  chance: 0.03,
  style: "drill",
  values: {
    // half-price taps per the crit's multiple (twice on its own)
    taps: 1,
  },
} satisfies CritMeta;
