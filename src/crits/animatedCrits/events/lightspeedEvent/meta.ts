import type { EventMeta } from "../../eventMeta";

// on the flight stage, spinning coins rush in out of the distance and are
// picked up as they fly past
export default {
  label: "Lightspeed",
  style: "flight",
  reward: "cash",
  chance: 0.01,
  values: {
    flyMs: 2000, // flying through the coins, until the floors appear far ahead
    coinApproachMs: 650, // each coin's rush in from the distance to being picked up
    payoutsPerCoin: 0.25, // the floor's payouts each picked-up coin pays
  },
} as const satisfies EventMeta;
