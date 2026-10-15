import type { CritMeta } from "../../../critKit/meta";

// a wisp ball rolling the locked floor's dust up, bursting it open, its
// new bar's first payouts paying double
export default {
  label: "Housewarming",
  chance: 0.03,
  style: "snowball",
  values: {
    // the floor it opens pays double this many payouts
    payouts: 5,
  },
} satisfies CritMeta;
