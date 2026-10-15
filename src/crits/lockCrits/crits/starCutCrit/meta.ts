import type { CritMeta } from "../../../critKit/meta";

// a blade wisp darts round the dark locked floor and carves a giant star
// across the lock in five quickening swipes, the pieces trembling in its
// glowing lines; one long cut through the middle and the pieces slide apart
// and burst the lock open, the glitter pouring through the new floor's button
// onto the one below: its next taps cost half
export default {
  label: "Star Cut",
  chance: 0.03,
  style: "slice",
  // half-price taps on the open floor under the one it opens
  values: { taps: 4 },
} satisfies CritMeta;
