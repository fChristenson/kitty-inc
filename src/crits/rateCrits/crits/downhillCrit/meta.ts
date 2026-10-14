import type { CritMeta } from "../../../critKit/meta";

// a ball of light rolling down the building, bar by bar, every speck of
// glitter on them sticking on, then each bar's next payouts paying more and
// more
export default {
  label: "Downhill",
  chance: 0.03,
  style: "snowball",
  // the payouts it grows on a bar (on its own), each `growth` bigger again
  values: { payouts: 5, ownPayouts: 10, growth: 0.25 },
} satisfies CritMeta;
