import type { EventMeta } from "../../eventMeta";

// on the flight stage, the view threads glitter hoops, each bursting into a
// ring of blasts round the screen's edge and paying, the last a huge golden
// one
export default {
  label: "Ring Run",
  style: "flight",
  reward: "cash",
  chance: 0.01,
  values: {
    payoutsPerHoop: 0.5, // the floor's payouts each hoop pays
    payoutsBigHoop: 2, // the floor's payouts the last hoop pays
  },
} as const satisfies EventMeta;
