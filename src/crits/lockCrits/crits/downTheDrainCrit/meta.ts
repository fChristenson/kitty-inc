import type { CritMeta } from "../../../critKit/meta";

// glitter strewn over the locked floor swirled round and gulped by a hole
// opening in the lock: each of the opened floor's next taps also pays out
// the floor below it
export default {
  label: "Down the Drain",
  chance: 0.03,
  style: "clutter",
  // drain taps on the opened floor's button
  values: { taps: 4 },
} satisfies CritMeta;
