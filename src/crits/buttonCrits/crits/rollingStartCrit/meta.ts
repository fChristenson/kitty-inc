import type { CritMeta } from "../../../critKit/meta";

// glitter strewn beside every button rolled up by a ball slamming into it:
// each of its next taps also levels the floor with the fewest upgrades
export default {
  label: "Rolling Start",
  chance: 0.03,
  style: "snowball",
  // roll taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
