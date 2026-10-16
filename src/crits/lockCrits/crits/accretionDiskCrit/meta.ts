import type { CritMeta } from "../../../critKit/meta";

// a tilted disk of stars spinning up round the lock, clumps spiralling in
// and striking it until jets blast out of its poles and it bursts open, the
// disk flung onto the new bar with every open floor's payout
export default {
  label: "Accretion Disk",
  chance: 0.03,
  style: "galaxy",
  // every open floor's payout in the building, times this and the multiple
  values: { payouts: 1 },
} satisfies CritMeta;
