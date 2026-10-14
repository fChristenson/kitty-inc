import type { CritMeta } from "../../../critKit/meta";

// a magic circle drawn under every button, whipping round until a pillar
// of light erupts through it: each of its next taps also levels a random
// floor
export default {
  label: "Hocus Pocus",
  chance: 0.03,
  style: "summon",
  // magic taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
