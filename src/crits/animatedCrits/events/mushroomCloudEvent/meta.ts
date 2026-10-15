import type { EventMeta } from "../../eventMeta";

// a column of cash billows up into a rolling mushroom cap
export default {
  label: "Mushroom Cloud",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    fallMs: 350, // the wisp plummeting onto the button
    riseMs: 800, // the cap shooting up the screen
    billowMs: 450, // churning ever faster at the top
    flightMs: 380, // each coin's suck into the total
    levelShare: 0.1, // of each bar's levels
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
