import type { CritMeta } from "../../../critKit/meta";

// going once, going twice, sold: a gavel of light swings down on a ball of
// glitter sitting on the lock, higher and harder each time, the third crushing
// it flat and shattering the lock open; the shockwave rolls down onto the
// floor below, its workers each going up a perma tier
export default {
  label: "Gavel",
  chance: 0.03,
  style: "crush",
  values: {
    // perma tiers each worker on the floor below the opened one goes up
    permaTiers: 1,
  },
} satisfies CritMeta;
