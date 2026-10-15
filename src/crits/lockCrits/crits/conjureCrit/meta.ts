import type { CritMeta } from "../../../critKit/meta";

// a magic circle drawn on the locked floor, turning faster and faster
// until a pillar of light erupts and it opens, its price paid back
export default {
  label: "Conjure",
  chance: 0.03,
  style: "summon",
  values: {
    // its cash: the price of the floor it opens, times this
    priceBack: 1,
  },
} satisfies CritMeta;
