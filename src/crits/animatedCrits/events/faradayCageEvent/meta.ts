import type { EventMeta } from "../../eventMeta";

// lightning hammers a cage of light over the clicked bar, then a colossal
// bolt crushes it into the bar
export default {
  label: "Faraday Cage",
  style: "lightning",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    dropMs: 280, // the cage dropping over the bar
    strikeMs: 1100, // the strikes, quickening
    finalMs: 250, // the pause before the colossal bolt
    crushMs: 180, // the cage crushing onto the bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
