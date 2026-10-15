import type { CritMeta } from "../../../critKit/meta";

// a wisp at the top readout drinking a swirl of coins and firing a fat river
// of cash down onto the next, where a new wisp gulps it and fires it on, the
// river thicker each relay, the last one bloated with all of it blasting it
// into its own: the bars share one baton, handed down them payout by payout
export default {
  label: "Cash Relay",
  chance: 0.03,
  style: "mix",
  // the bar holding the baton pays `payout` times (its own `ownPayout`) on
  // its next payout, then hands it to the next bar of the relay, round them
  // `laps` times, for at most `ms`
  values: { payout: 4, ownPayout: 8, laps: 3, ms: 60_000 },
} satisfies CritMeta;
