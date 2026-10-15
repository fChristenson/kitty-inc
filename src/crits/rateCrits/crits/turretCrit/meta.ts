import type { CritMeta } from "../../../critKit/meta";

// a turret wisp left of the bars spinning up, spraying ever denser spirals
// across every readout, then locking on and firing one straight volley into
// each: its next payouts each a 1 in 3 shot at paying x5
export default {
  label: "Turret",
  chance: 0.03,
  style: "gunfire",
  // the lucky payouts on each bar (its own ownPayouts), each 1 in odds to pay
  // lucky times
  values: { payouts: 8, ownPayouts: 16, lucky: 5, odds: 3 },
  isNew: true,
} satisfies CritMeta;
