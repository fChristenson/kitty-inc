import type { CritMeta } from "../../../critKit/meta";

// magic circles drawn beside every button at once, whipping round in step
// until pillars erupt and a wisp leaps out of each into its button: each of
// their next taps also pays out the most upgraded floor
export default {
  label: "Familiar",
  chance: 0.03,
  style: "summon",
  // fetching taps on each button, twice as many on its own, and the payouts
  // each pays out of the most upgraded floor
  values: { taps: 3, payouts: 1 },
  isNew: true,
} satisfies CritMeta;
