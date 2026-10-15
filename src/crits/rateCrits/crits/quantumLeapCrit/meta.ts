import type { CritMeta } from "../../../critKit/meta";

// a wisp leaping readout to readout down the column through twin rings,
// each bar's next payouts each followed at once by a leaped one
export default {
  label: "Quantum Leap",
  chance: 0.03,
  style: "portal",
  values: {
    // a leaped fill runs this many times as fast: done in a blink
    speed: 30,
    // leaped fills a bar gets, its own
    leaps: 4,
    ownLeaps: 8,
  },
  isNew: true,
} satisfies CritMeta;
