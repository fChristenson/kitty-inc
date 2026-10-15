import type { EventMeta } from "../../eventMeta";

// the rare "Ricochet" event: one fat stream bounces off the screen's edges
// 3-5 times before diving into the total, paying the floor's payout once per
// bounce
export default {
  label: "Ricochet",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    travelMs: 500, // each coin's trip, bounces and all
  },
} as const satisfies EventMeta;
