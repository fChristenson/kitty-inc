import type { EventMeta } from "../../eventMeta";

// a big gold dynamo wheel by the dark locked floor spins up from a crawl to a
// blur, sparks flying off its rim and light streaming into its hub, jolting
// at each speed it passes, until it overloads and discharges one huge bolt
// into the lock, blowing the floor open
export default {
  label: "Dynamo",
  style: "charge",
  reward: "free floors",
  chance: 0.01,
  values: {
    firstMs: 160, // from the click till the wheel starts turning
    chargeMs: 1500, // its spin-up, till it overloads
    strikeMs: 60, // the bolt reaching the lock
    holdMs: 450,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
