import type { CritMeta } from "../../../critKit/meta";

// two slabs closing in on a wisp in the locked floor like a vice until it
// bursts, the floor opening, its button charged with levels
export default {
  label: "Vice",
  chance: 0.03,
  style: "crush",
  values: {
    // the floor it opens has its button charged with this many levels per the
    // crit's multiple
    charge: 2,
  },
} satisfies CritMeta;
