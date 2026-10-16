import type { CritMeta } from "../../../critKit/meta";

// a glowing hamster ball with a wisp running inside rolling back and forth
// over the locked floor, gathering glitter and bumping the lock, until it
// rams it open and the wisp tumbles onto the new floor's button: each of its
// next taps also levels the next open floors above it
export default {
  label: "Hamster Ball",
  chance: 0.03,
  style: "snowball",
  // scurry taps on the opened floor's button; open floors above each levels
  values: { taps: 3, floors: 3 },
} satisfies CritMeta;
