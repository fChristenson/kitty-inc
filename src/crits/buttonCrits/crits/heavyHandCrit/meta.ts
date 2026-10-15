import type { CritMeta } from "../../../critKit/meta";

// slabs slamming in unison on a wisp over every button, each tap of it
// then landing three levels
export default {
  label: "Heavy Hand",
  chance: 0.03,
  style: "crush",
  values: {
    // taps landing three levels per the crit's multiple (twice on its own)
    taps: 0.5,
  },
} satisfies CritMeta;
