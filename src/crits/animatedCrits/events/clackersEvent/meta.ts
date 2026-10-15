import type { EventMeta } from "../../eventMeta";

// a hand wisp swings two balls on strings like the clacker toy, clacking ever
// faster for levels
export default {
  label: "Clackers",
  style: "bounce",
  reward: "levels",
  chance: 0.01,
  values: {
    growMs: 250, // the balls dropping to hang off the hand
    clackMs: 1700, // from the first pump to the last smash
    levelShare: 0.012, // levels per clack
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
