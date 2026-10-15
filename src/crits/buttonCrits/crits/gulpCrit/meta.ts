import type { CritMeta } from "../../../critKit/meta";

// one hungry orb beside its own button drinking the glitter off every other
// button until it bursts it back onto them all: each of their next taps also
// pays out the floor whose button gulped
export default {
  label: "Gulp",
  chance: 0.03,
  style: "pull",
  // gulp taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
