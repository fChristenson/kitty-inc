import type { CritMeta } from "../../../critKit/meta";

// a lit bomb skipping along the bar under the locked floor in quickening
// hops, its fuse burning down, until it leaps into the lock and blows it
// open; its shrapnel rains through onto the floor below, which levels up
export default {
  label: "Bouncing Bomb",
  chance: 0.03,
  style: "bounce",
  // levels on the floor below the opened one, times the crit's multiple
  values: { levels: 4 },
  isNew: true,
} satisfies CritMeta;
