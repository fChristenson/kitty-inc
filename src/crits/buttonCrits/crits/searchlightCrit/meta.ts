import type { CritMeta } from "../../../critKit/meta";

// a searchlight at the foot of the buttons sweeping its beam over them, back
// and forth, then locking onto each in turn: each of its next taps also
// hires a worker on the floor above
export default {
  label: "Searchlight",
  chance: 0.03,
  style: "beam",
  // spot taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
