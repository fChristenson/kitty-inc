import type { CritMeta } from "../../../critKit/meta";

// a gun wisp on every bar's end firing three-round bursts into its readout,
// quicker and quicker, then one long burst: every third payout pays triple
// for a while
export default {
  label: "Burst Fire",
  chance: 0.03,
  style: "gunfire",
  // every third payout's multiple, for ms (its own for ownMs)
  values: { payout: 3, ms: 40_000, ownMs: 80_000 },
} satisfies CritMeta;
