import type { CritMeta } from "../../../critKit/meta";

// coins swirling into every readout like a whirlpool, a trickle then a
// flood: every bar pays more and more for a while
export default {
  label: "Coin Swirl",
  chance: 0.03,
  style: "money",
  // the payout a bar ramps up to over ms (its own ownMs), then back to normal
  values: { payout: 3, ms: 30_000, ownMs: 60_000 },
  isNew: true,
} satisfies CritMeta;
