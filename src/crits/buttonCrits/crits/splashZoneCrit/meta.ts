import type { CritMeta } from "../../../critKit/meta";

// drops of light splashing onto the buttons, quickening to a downpour,
// each tap of them then levelling the floors above and below too
export default {
  label: "Splash Zone",
  chance: 0.03,
  style: "ripple",
  values: {
    // taps also levelling the floors above and below, per the crit's multiple
    // (twice on its own)
    taps: 0.5,
  },
} satisfies CritMeta;
