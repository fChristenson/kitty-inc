import type { CritMeta } from "../../../critKit/meta";

// a little gold funnel spinning up beside its button, zipping up and down the
// column catching every button's sparkle, whipping round and flinging it all
// back onto every button at once: each of their next taps also levels the
// next floor round the building in turn
export default {
  label: "Whirligig",
  chance: 0.03,
  style: "tornado",
  // spin taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
