import type { CritMeta } from "../../../critKit/meta";

// wisps racing in from both sides of the screen and colliding on the total,
// quicker each, until two huge ones meet head-on
export default {
  label: "Crash Course",
  chance: 0.03,
  style: "wisp",
} satisfies CritMeta;
