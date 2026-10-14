import type { CritMeta } from "../../../critKit/meta";

// a hole by the bars peeling the glitter off every one of them in a
// spiralling flood, collapsing and firing it back: each bar's next
// payouts come quicker
export default {
  label: "Rip Current",
  chance: 0.03,
  style: "pull",
  // how many times as fast a bar runs, for its next payouts (its own ownPayouts)
  values: { speed: 2, payouts: 8, ownPayouts: 16 },
} satisfies CritMeta;
