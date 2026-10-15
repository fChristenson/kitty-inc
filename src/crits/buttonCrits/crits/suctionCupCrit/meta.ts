import type { CritMeta } from "../../../critKit/meta";

// a point of light beside every button sucking in the glitter round it,
// swelling until it bursts into the button: each of its next taps also pays
// out the floor with the most workers
export default {
  label: "Suction Cup",
  chance: 0.03,
  style: "pull",
  // suction taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
