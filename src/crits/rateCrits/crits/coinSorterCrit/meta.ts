import type { CritMeta } from "../../../critKit/meta";

// the number bursts into coins strewn over every bar, which sort themselves
// into stacks beside each readout in quickening waves, then topple into it
// like dominoes: the bar's next payouts pay more for every worker on its
// floor
export default {
  label: "Coin Sorter",
  chance: 0.03,
  style: "clutter",
  // the payouts it lasts (on each bar, on its own), each paying 1 +
  // `perWorker` per worker on the floor, at least `min` times
  values: { payouts: 5, ownPayouts: 8, perWorker: 0.25, min: 1.5 },
} satisfies CritMeta;
