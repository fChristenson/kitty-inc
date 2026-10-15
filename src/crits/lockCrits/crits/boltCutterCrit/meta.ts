import type { CritMeta } from "../../../critKit/meta";

// bolts striking the locked floor until a giant one splits it open, its
// bar filling with levels
export default {
  label: "Bolt Cutter",
  chance: 0.03,
  style: "lightning",
  values: {
    // its levels on the floor it opens, per the crit's multiple
    levels: 5,
  },
} satisfies CritMeta;
