import type { EventMeta } from "../../eventMeta";

// the view lifts into space, the ship blows a fortress core's three turning
// shield rings apart wisp by wisp (each paying), then the bare core in a
// chain of blasts
export default {
  label: "Fortress",
  style: "shmup",
  reward: "cash",
  chance: 0.01,
  values: {
    enterMs: 450, // the view lifting off the floors
    flyMs: 3700, // the fight, until the floors rush up
    leaveMs: 3200, // the ship starts streaking off the top
    payoutsPerNode: 0.15, // the floor's payouts each shield wisp pays
    payoutsCore: 3, // the floor's payouts the core pays
  },
} as const satisfies EventMeta;
