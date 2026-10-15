import type { CritMeta } from "../../../critKit/meta";

// a plough of light sweeps the number's glitter into a heap beside every
// readout and each heap hops in: the bar saves up, its next payouts put
// away, then one payout lands the whole nest egg with a bonus on top
export default {
  label: "Nest Egg",
  chance: 0.03,
  style: "clutter",
  // payouts put away (on each bar, on its own), each paying `hold` times;
  // then one paying 1 + all held back + `bonus` per payout put away
  values: { held: 3, ownHeld: 5, hold: 0.5, bonus: 1 },
  isNew: true,
} satisfies CritMeta;
