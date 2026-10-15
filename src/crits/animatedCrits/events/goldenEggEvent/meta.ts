import type { EventMeta } from "../../eventMeta";

// a big golden egg thuds into the middle of the frozen screen and charges,
// glowing cracks snapping across it quicker and quicker, each spilling cash
// onto a floor, until it hatches in one huge burst flooding every floor
export default {
  label: "Golden Egg",
  style: "charge",
  reward: "cash",
  chance: 0.01,
  values: {
    dropMs: 220, // from the click till the egg thuds down
    chargeMs: 1300, // its charging, till it hatches
    cracks: 7, // snaps across the shell, closing up
    crackCoins: 12, // coins each crack spills onto a floor
    reward: 4, // floor income × floor number × this
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
