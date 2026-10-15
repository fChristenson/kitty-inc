import type { EventMeta } from "../../eventMeta";

// magic circles on the floors' grounds relaying pillars of light up the
// building, each spinning up quicker, the last bursting the locked floor open
export default {
  label: "Torch Relay",
  style: "summon",
  reward: "free floors",
  chance: 0.01,
  values: {
    firstMs: 240, // from the click till the first circle is drawn
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
