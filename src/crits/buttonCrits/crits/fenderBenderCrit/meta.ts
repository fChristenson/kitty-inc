import type { CritMeta } from "../../../critKit/meta";

// two wisps circling each other beside every button, crashing head-on and
// darting in: each of its next taps also levels the building's top and
// bottom floors
export default {
  label: "Fender Bender",
  chance: 0.03,
  style: "wisp",
  // crash taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
