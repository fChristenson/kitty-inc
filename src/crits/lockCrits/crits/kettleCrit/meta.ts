import type { CritMeta } from "../../../critKit/meta";

// a kettle on the lock boiling up until it blows its lid open, then pouring
// its steam onto the new floor's button: its next payouts each brew a free tap
export default {
  label: "Kettle",
  chance: 0.03,
  style: "charge",
  // the opened floor's payouts that each brew free taps, and how many each
  values: { payouts: 4, taps: 1 },
} satisfies CritMeta;
