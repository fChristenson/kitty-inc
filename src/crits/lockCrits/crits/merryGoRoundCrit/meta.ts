import type { CritMeta } from "../../../critKit/meta";

// coloured wisps swooping onto a tilted ring round the lock, bobbing like
// carousel horses as it spins up with each rider, then slamming in at once:
// the floor bursts open and they scatter over it; its workers go on a long
// boost
export default {
  label: "Merry-Go-Round",
  chance: 0.03,
  style: "wisp",
  // how long (s) every worker on the opened floor stays boosted
  values: { boostSeconds: 90 },
} satisfies CritMeta;
