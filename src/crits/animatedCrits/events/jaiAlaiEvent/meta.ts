import type { EventMeta } from "../../eventMeta";

// a player wisp loops the ball round its basket and hurls it onto bar after
// bar
export default {
  label: "Jai Alai",
  style: "bounce",
  reward: "levels",
  chance: 0.01,
  values: {
    growMs: 250, // the player popping up
    loopMs: 220, // the ball looping round the basket
    hurlMs: 150, // the throw onto the bar
    backMs: 300, // the rebound down to the next catch
    levelShare: 0.012, // levels per hit
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
