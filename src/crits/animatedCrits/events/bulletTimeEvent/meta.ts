import type { EventMeta } from "../../eventMeta";

// a volley freezes in the air, then slams into the bars
export default {
  label: "Bullet Time",
  style: "gunfire",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    riseMs: 250, // the guns rising
    freezeAfterMs: 480, // the volley flying before time stops
    freezeMs: 800, // time all but stopped
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
