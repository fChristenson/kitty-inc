import type { EventMeta } from "../../eventMeta";

// on the flight stage, the view dives down a swirling vortex of glitter
// rings, shooting the wisps riding its wall (each paying), then bursts out
// the far end
export default {
  label: "Wormhole Dive",
  style: "flight",
  reward: "cash",
  chance: 0.01,
  values: {
    payoutsPerRider: 0.3, // the floor's payouts each wisp pays
    payoutsOut: 2, // the floor's payouts the burst out pays
  },
} as const satisfies EventMeta;
