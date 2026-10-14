import type { CritMeta } from "../../../critKit/meta";

// a wisp warping from far rings across the screen out of near ones by the
// buttons, slamming into each: each tap of them then also levels the floor
// two up
export default {
  label: "Jump Gate",
  chance: 0.03,
  style: "portal",
  // jump taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
