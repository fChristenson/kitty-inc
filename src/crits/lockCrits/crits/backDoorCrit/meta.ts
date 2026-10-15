import type { CritMeta } from "../../../critKit/meta";

// wisps diving into a ring on the floor below and bursting out of its twin
// inside the locked floor, slamming the lock from the inside till it bursts
// open: the new floor's next payouts each also pay out the floor below it
export default {
  label: "Back Door",
  chance: 0.03,
  style: "portal",
  // how many of the opened floor's payouts also pay the floor below
  values: { payouts: 20 },
} satisfies CritMeta;
