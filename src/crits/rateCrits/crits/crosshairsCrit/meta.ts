import type { CritMeta } from "../../../critKit/meta";

// a turret scanning an aim laser over the bars, locking each, then firing
// every beam: each bar's next payout five times as big, its own ten
export default {
  label: "Crosshairs",
  chance: 0.03,
  style: "beam",
} satisfies CritMeta;
