import type { EventMeta } from "../../eventMeta";

// on the flight stage, the view dives at a spiral galaxy of glitter, the guns
// blowing the wisps on its arms core outward (each paying), then the core
export default {
  label: "Galaxy Flight",
  style: "flight",
  reward: "cash",
  chance: 0.01,
  values: {
    payoutsPerRider: 0.3, // the floor's payouts each wisp pays
    payoutsCore: 2, // the floor's payouts the core pays
  },
} as const satisfies EventMeta;
