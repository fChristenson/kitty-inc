import type { CritMeta } from "../../../critKit/meta";

// a wisp chasing another round every readout, gaining, catching it on the
// readout: each bar's next payouts grow bigger one after another
export default {
  label: "Catch Up",
  chance: 0.03,
  style: "wisp",
  // payouts that grow, each step bigger than the last (its own twice as many)
  values: { payouts: 6, step: 0.25 },
} satisfies CritMeta;
