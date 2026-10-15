import type { CritMeta } from "../../../critKit/meta";

// a beetle wisp rolling a gold ball past the buttons, their glitter leaping
// on, then flipping the huge ball onto its own button: each of its next taps
// also levels the floor one more than the last, +1, +2, +3...
export default {
  label: "Dung Beetle",
  chance: 0.03,
  style: "snowball",
  // heap taps on each button, twice as many on its own
  values: { taps: 4 },
} satisfies CritMeta;
