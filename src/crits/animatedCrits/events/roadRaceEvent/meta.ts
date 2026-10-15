import type { EventMeta } from "../../eventMeta";

// the floors zoom away into a race already flat out, a small ship skimming
// the street between the buildings through a snake of coins, each paying into
// the total, round a bend, down the straight and through the finish gate's
// window onto the floors
export default {
  label: "Road Race",
  style: "road race",
  reward: "cash",
  chance: 0.01,
  values: {
    enterMs: 250, // the floors zooming away into the race
    flyMs: 4100, // the race, until the finish gate's window is close (5s from the click to the crash)
    payoutsPerCoin: 0.15, // the floor's payouts each coin pays
  },
} as const satisfies EventMeta;
