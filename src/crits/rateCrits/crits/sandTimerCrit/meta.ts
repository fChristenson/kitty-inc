import type { CritMeta } from "../../../critKit/meta";

// gold dots draw a giant hourglass beside the bars; it flips and pours its
// sand into every readout, then shatters into its own: the bar pays more for
// a while, every payout topping the time up
export default {
  label: "Sand Timer",
  chance: 0.03,
  style: "drawing",
  // each payout x`payout` for `ms` (`ownMs` on its own bar), every payout
  // adding `topUpMs`, never past `maxMs` from when it landed
  values: { payout: 2, ms: 10000, ownMs: 15000, topUpMs: 1000, maxMs: 20000 },
} satisfies CritMeta;
