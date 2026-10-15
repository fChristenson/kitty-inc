import type { EventMeta } from "../../eventMeta";

// a wisp twirls a skirt of cash, then stamps on the bar
export default {
  label: "Twirl",
  style: "mix",
  reward: "crit tiers + cash",
  chance: 0.01,
  values: {
    twirlsMs: [600, 450] as [number, number], // each twirl, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
