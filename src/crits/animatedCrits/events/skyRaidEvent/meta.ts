import type { EventMeta } from "../../eventMeta";

// the view lifts high off the floors into space seen from above, the ship
// weaves up a streaming starfield through drones' fans, gunships' rings and a
// boss's spiral of wisp bullets, shooting each down in a paying blast, the
// boss in a chain of blasts, then the view dives back onto the floors
export default {
  label: "Sky Raid",
  style: "shmup",
  reward: "cash",
  chance: 0.01,
  values: {
    enterMs: 450, // the view lifting off the floors
    flyMs: 4000, // the raid, until the floors rush up (5s from the click to the crash)
    payoutsPerKill: 0.8, // the floor's payouts each drone and gunship pays
    payoutsBoss: 3, // the floor's payouts the boss pays
  },
} as const satisfies EventMeta;
