import type { CritMeta } from "../../../critKit/meta";

// hundreds of gold dots streaming in faster and faster into a giant light
// bulb over the locked floor; its filament flickers on, buzzing, until it
// blazes and bursts open the lock, raining onto the new floor's button: each
// of its next taps also levels the floors around it
export default {
  label: "Bright Idea",
  chance: 0.03,
  style: "drawing",
  // bright taps on the opened floor's button; floors above and below each
  // tap lights up
  values: { taps: 4, reach: 2 },
  isNew: true,
} satisfies CritMeta;
