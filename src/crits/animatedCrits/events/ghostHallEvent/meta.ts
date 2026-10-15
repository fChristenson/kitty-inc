import type { EventMeta } from "../../eventMeta";

// the floors' screen drops away in strips onto a candlelit hall of portraits;
// ghost wisps swoop out of the frames and pop into paying coins, a huge one
// last; the view rushes into the great portrait onto the floors
export default {
  label: "Ghost Hall",
  style: "fps",
  reward: "cash",
  chance: 0.01,
  values: {
    dropMs: 320, // the floors' screen falling away in strips
    glideMs: 3200, // the view gliding down the hall
    flyMs: 0, // the rush into the great portrait is the landing
    payoutsPerGhost: 0.4, // the floor's payouts each ghost pays
    payoutsBig: 3, // the floor's payouts the huge ghost pays
  },
} as const satisfies EventMeta;
