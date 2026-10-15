import type { CritMeta } from "../../../critKit/meta";

// a racer and its chaser lapping every bar, each shifting up a gear for
// good; rarer, being for good
export default {
  label: "Shift Up",
  chance: 0.01,
  style: "race",
  values: {
    // a bar this many times as fast for good
    speed: 2,
  },
} satisfies CritMeta;
