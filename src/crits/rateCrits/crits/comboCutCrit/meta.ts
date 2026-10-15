import type { CritMeta } from "../../../critKit/meta";

// glitter balls tossed up over every bar, cut mid-air in a growing combo
// down the building: each bar's next payout pays its combo, x2, x3, x4 …,
// its own the most
export default {
  label: "Combo Cut",
  chance: 0.03,
  style: "slice",
  values: {
    // the first bar's combo, each next one more, up to maxCombo - 1; its own
    // maxCombo
    first: 2,
    maxCombo: 8,
  },
} satisfies CritMeta;
