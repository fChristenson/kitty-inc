import type { CritMeta } from "../../../critKit/meta";

// a funnel of fire and gold sparks spins up beside the bars and its foot
// races over every readout, catching their sparks, then flings it all back
// in one burst: each bar's payouts flare up, then burn back down
export default {
  label: "Firenado",
  chance: 0.03,
  style: "tornado",
  // for `ms` (`ownMs` on its own bar) each payout x`start` climbing to
  // x`peak` `rise` of the way through, then burning down to x1
  values: { start: 1.5, peak: 4, rise: 0.3, ms: 15000, ownMs: 25000 },
} satisfies CritMeta;
