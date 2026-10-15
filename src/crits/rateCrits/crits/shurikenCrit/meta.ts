import type { CritMeta } from "../../../critKit/meta";

// spinning throwing stars of light whip in off the sides one after another,
// each slicing a bar's readout in two, quicker and quicker, then two big ones
// cross through its own readout in an X: for its next payouts, each payout
// sends the bar's next fill off in a flurry, burst times as fast for burstMs
export default {
  label: "Shuriken",
  chance: 0.03,
  style: "slice",
  values: {
    // times as fast for burstMs, from the hit and again from each payout
    burst: 5,
    burstMs: 1200,
    // the payouts it lasts, its own's
    payouts: 5,
    ownPayouts: 10,
  },
} satisfies CritMeta;
