import type { EventMeta } from "../../eventMeta";

// the floors' screen swings open like a vault door onto a strongroom of gold;
// guards dropped one by one burst their gold into paying coins, then the
// round vault door is blown and a flood of coins pours out
export default {
  label: "Bank Job",
  style: "fps",
  reward: "cash",
  chance: 0.01,
  values: {
    swingMs: 320, // the floors' screen swinging open
    walkMs: 3000, // the walk down the strongroom
    flyMs: 600, // the flood pouring out before the floors rush up
    payoutsPerGuard: 0.6, // the floor's payouts each guard's gold pays
    payoutsVault: 3, // the floor's payouts the vault door pays
  },
} as const satisfies EventMeta;
