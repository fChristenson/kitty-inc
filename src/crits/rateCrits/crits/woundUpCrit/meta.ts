import type { CritMeta } from "../../../critKit/meta";

// a wisp charging on every bar's readout until it bursts, each bar then
// paying more for a while
export default {
  label: "Wound Up",
  chance: 0.03,
  style: "charge",
  values: {
    // a bar's payouts this many times as big for ms
    payout: 1.5,
    ms: 30_000,
  },
} satisfies CritMeta;
