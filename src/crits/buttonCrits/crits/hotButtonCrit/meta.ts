import type { CritMeta } from "../../../critKit/meta";

// a disk of stars flung onto every button, each tap of it then rolling
// its next crit more often
export default {
  label: "Hot Button",
  chance: 0.03,
  style: "galaxy",
  values: {
    // a Hot Button tap rolls its next crit up to this many times, till one
    // lands
    rolls: 3,
  },
} satisfies CritMeta;
