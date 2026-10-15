import type { EventMeta } from "../../eventMeta";

// the floors' screen splits into strips onto a checkerboard plain; the ship
// weaves low between pillars shooting waves of wisps into paying sprays of
// coins, then a wisp serpent head to tail, and flies into a giant screen of
// the floors at the horizon
export default {
  label: "Harrier",
  style: "rail shooter",
  reward: "cash",
  chance: 0.01,
  values: {
    splitMs: 300, // the floors' screen's strips sliding apart
    flyMs: 0, // the flight into the floors' screen is the landing
    payoutsPerKill: 0.3, // the floor's payouts each wave wisp pays
    payoutsSerpent: 3, // the floor's payouts the serpent pays
  },
} as const satisfies EventMeta;
