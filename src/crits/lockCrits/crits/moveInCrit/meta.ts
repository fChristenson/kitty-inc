import type { CritMeta } from "../../../critKit/meta";

// wisps bouncing up the building into the locked floor, dropping in as
// its new cats once it bursts open
export default {
  label: "Move In",
  chance: 0.03,
  style: "bounce",
} satisfies CritMeta;
