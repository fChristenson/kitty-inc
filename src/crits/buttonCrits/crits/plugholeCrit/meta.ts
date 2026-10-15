import type { CritMeta } from "../../../critKit/meta";

// a plughole of light beside the column drains the shine off every button in
// a whirl, collapses and bursts it back out onto them: each of the button's
// next taps also hires a worker on the open floor two below
export default {
  label: "Bath Plug",
  chance: 0.03,
  style: "pull",
  // plug taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
