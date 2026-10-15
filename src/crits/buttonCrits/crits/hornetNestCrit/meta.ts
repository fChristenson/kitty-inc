import type { CritMeta } from "../../../critKit/meta";

// a nest of glitter swelling beside every button as specks swarm in from all
// round, until it bursts and the swarm stings into the button: each of its
// next taps also hires on the most upgraded floor
export default {
  label: "Hornet Nest",
  chance: 0.03,
  style: "swarm",
  // sting taps on each button, twice as many on its own
  values: { taps: 3 },
  isNew: true,
} satisfies CritMeta;
