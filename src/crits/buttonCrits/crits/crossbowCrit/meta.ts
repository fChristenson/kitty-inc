import type { CritMeta } from "../../../critKit/meta";

// a crossbow of light beside every button cranked back click by click, all
// charging together, then loosed down the column into each: each of their
// next taps also pays out the open floor two above
export default {
  label: "Crossbow",
  chance: 0.03,
  style: "charge",
  // bolt taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
