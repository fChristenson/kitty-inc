import type { CritMeta } from "../../../critKit/meta";

// a nozzle wisp soaking the gold off the best-paying bar's readout and
// hissing it over every other one: each bar's next payouts pay as much as
// the best-paying floor's
export default {
  label: "Top Coat",
  chance: 0.03,
  style: "spray",
  // the coated payouts, on each bar and on its own; the most times over a
  // payout gets (it's always at least x2)
  values: { payouts: 3, ownPayouts: 5, cap: 1000 },
} satisfies CritMeta;
