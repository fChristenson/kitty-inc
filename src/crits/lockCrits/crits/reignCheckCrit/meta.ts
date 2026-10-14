import type { CritMeta } from "../../../critKit/meta";

// a crown rained down out of glitter over the locked floor, squall after
// squall, crashing through the lock and crowning the new floor with levels
export default {
  label: "Reign Check",
  chance: 0.03,
  style: "drawing",
  // levels on the opened floor per multiple of the crit
  values: { levels: 5 },
} satisfies CritMeta;
