import type { EventMeta } from "../../eventMeta";

// the rare "Breakout" event: the clicked floor's income bar bats the wisp up
// through a wall of bricks, each smashing into coins, until the rest blow at
// once into the total
export default {
  label: "Breakout",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    dropMs: 180, // the wall slamming down
    // each volley's climb from the bar to the top, ever quicker (its fall's as long)
    upMs: [320, 270, 225, 190, 165],
    holdMs: 450, // the coins hanging after the wall blows
    mergeMs: 500,
  },
} as const satisfies EventMeta;
