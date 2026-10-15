import type { EventMeta } from "../../eventMeta";

// the floors shrink away into space; a boss core fills the screen with a
// bullet curtain, the ship weaving untouched through it; its bomb's ring
// turns every bullet into a coin sucked into the ship, and the boss blows
// apart in a chain
export default {
  label: "Bullet Cancel",
  style: "shmup",
  reward: "cash",
  chance: 0.01,
  values: {
    enterMs: 300, // the floors shrinking away below
    payouts: 4, // the floor's payouts all the coins pay between them
    payoutsBoss: 2, // the floor's payouts the boss pays
  },
} as const satisfies EventMeta;
