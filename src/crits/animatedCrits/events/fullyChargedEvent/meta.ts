import type { EventMeta } from "../../eventMeta";

// a spark under the dark locked floor draws streams of light up off every
// bar, a trickle quickening to a flood, swelling, glowing and trembling
// harder, then punches up into the lock and bursts the floor open
export default {
  label: "Fully Charged",
  style: "charge",
  reward: "free floors",
  chance: 0.01,
  values: {
    firstMs: 200, // from the click till the spark lights up
    chargeMs: 1300, // its charging, till it's full
    punchMs: 140, // punching up into the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
