import type { CritMeta } from "../../../critKit/meta";

// gold-green dots draw a giant four-leaf clover beside the bars; its leaves
// shower into every readout and its stem and heart slam into its own: the
// bar's next payouts each pay the crit tier armed on its upgrade button
export default {
  label: "Four-Leaf Clover",
  chance: 0.03,
  style: "drawing",
  // the payouts it lasts (on each bar, on its own), each paying the armed
  // tier's multiplier, at least `min` times
  values: { payouts: 4, ownPayouts: 6, min: 1.5 },
} satisfies CritMeta;
