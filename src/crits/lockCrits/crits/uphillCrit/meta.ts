import type { CritMeta } from "../../../critKit/meta";

// a ball of light rolling up the building bar by bar, zigzagging along each
// and hopping to the next, quicker each pass, the glitter on every bar
// sticking on; it slams into the lock, bursts it open and sprays over the
// new floor: every worker on the floors it rolled past gets a boost
export default {
  label: "Uphill",
  chance: 0.03,
  style: "snowball",
  // at most this many floors below the new one rolled past (and boosted)
  values: { floors: 4 },
} satisfies CritMeta;
