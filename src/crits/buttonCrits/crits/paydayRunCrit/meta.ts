import type { CritMeta } from "../../../critKit/meta";

// a wisp racing down the buttons with a river of cash pouring in behind it:
// each of their next taps also pays out the least upgraded floor
export default {
  label: "Payday Run",
  chance: 0.03,
  style: "mix",
  // payday taps on each button, twice as many on its own
  values: { taps: 3 },
  isNew: true,
} satisfies CritMeta;
