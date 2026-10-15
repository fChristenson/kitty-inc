import type { CritMeta } from "../../../critKit/meta";

// a ball of light zigzags down the building along every readout's row,
// picking up the glitter on each and swelling, a chunk of it bursting into
// each readout; the giant ball bursts into its own: the bars it hit share
// one snowball, every payout from any of them making all of them pay more
export default {
  label: "Snowball Effect",
  chance: 0.03,
  style: "snowball",
  // for `ms`, every payout on any rewarded bar adds `step` to all their
  // payouts, at most x`cap`
  values: { ms: 15000, step: 0.04, cap: 3 },
} satisfies CritMeta;
