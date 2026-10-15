import type { EventMeta } from "../../eventMeta";

// the rare "Coin Toss" event: the button streams coins into one giant coin
// that's tossed high, flips and lands heads or tails, then bursts into coins
// that merge into the total
export default {
  label: "Coin Toss",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    fillMs: 900, // the button filling the giant coin
    flipMs: 900, // the toss, up and back down
    showMs: 500, // heads or tails showing before it bursts
    durationMs: 1_000, // after the burst: blast out, hang, then the merge
    mergeMs: 500,
    headsMultiplier: 3, // on top of the floor's income times its floor number
    tailsMultiplier: 2,
  },
} as const satisfies EventMeta;
