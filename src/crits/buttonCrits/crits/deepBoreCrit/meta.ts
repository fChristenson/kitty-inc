import type { CritMeta } from "../../../critKit/meta";

// drills boring up into every button like pistons, each tap of it then
// levelling the floor above too
export default {
  label: "Deep Bore",
  chance: 0.03,
  style: "drill",
  values: {
    // taps levelling the floor above per the crit's multiple (twice on its own)
    taps: 1,
  },
} satisfies CritMeta;
