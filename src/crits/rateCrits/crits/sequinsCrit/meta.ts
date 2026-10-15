import type { CritMeta } from "../../../critKit/meta";

// the number bursts into hundreds of sequins strewn round every readout,
// which tidy themselves bar by bar into shining rings round each, its own
// last in one big ring: every ringed bar's next payouts pay more for every
// bar the same burst ringed, a matching set
export default {
  label: "Sequins",
  chance: 0.03,
  style: "clutter",
  // the payouts it lasts (on each bar, on its own), each paying 1 +
  // `perRing` per bar in its set, between `min` and `max` times
  values: { payouts: 4, ownPayouts: 7, perRing: 0.2, min: 1.5, max: 3 },
  isNew: true,
} satisfies CritMeta;
