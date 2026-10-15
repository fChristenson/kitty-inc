import type { CritMeta } from "../../../critKit/meta";

// a ring of wisps hand in hand dancing beside every button, faster and
// tighter until it spins to a blur and leaps in: each of its next taps also
// boosts every worker on the tapped floor
export default {
  label: "Ring Dance",
  chance: 0.03,
  style: "wisp",
  // pep taps on each button, twice as many on its own
  values: { taps: 3 },
  isNew: true,
} satisfies CritMeta;
