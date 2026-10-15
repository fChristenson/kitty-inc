import type { CritMeta } from "../../../critKit/meta";

// drops of light trickling down the buttons, each tap of them then
// levelling the floors below too
export default {
  label: "Trickle Down",
  chance: 0.03,
  style: "ripple",
  values: {
    // taps also levelling up to floors floors below, per the crit's multiple
    // (twice on its own)
    taps: 0.5,
    floors: 3,
  },
} satisfies CritMeta;
