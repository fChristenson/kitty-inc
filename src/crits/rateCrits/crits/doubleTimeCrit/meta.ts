import type { CritMeta } from "../../../critKit/meta";

// a pen drawing a giant fast-forward sign that streams onto the bars,
// each then faster for its next payouts
export default {
  label: "Double Time",
  chance: 0.03,
  style: "drawing",
  values: {
    // a bar this many times as fast for its next payouts (its own ownPayouts)
    speed: 3,
    payouts: 4,
    ownPayouts: 8,
  },
} satisfies CritMeta;
