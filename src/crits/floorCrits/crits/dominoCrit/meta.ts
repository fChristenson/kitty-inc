import type { CritMeta } from "../../../critKit/meta";

// diving into the lowest bar in view, its payout knocking up bar to bar
// to the top, each paying a step more (x1, x2, x3…)
export default {
  label: "Domino",
  chance: 0.03,
  style: "number",
} satisfies CritMeta;
