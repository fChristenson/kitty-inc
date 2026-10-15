import type { CritMeta } from "../../../critKit/meta";

// slabs of light slamming balls of glitter flat on every readout in waves
// rolling down the building: each bar's next payouts pay big, a bit less each
export default {
  label: "Smackdown",
  chance: 0.03,
  style: "crush",
  // the first payout's multiple, shrinking towards 1 over the next payouts
  // (its own over ownPayouts)
  values: { payout: 5, payouts: 5, ownPayouts: 10 },
  isNew: true,
} satisfies CritMeta;
