import type { EventMeta } from "../../eventMeta";

// the rare "Jackpot Reels" event: the button streams coins into three slot
// reels, which stop one by one with a slam; it pays the floor's income times
// its floor number times the reels' sum
export default {
  label: "Jackpot",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    spinMs: 1_000, // until the first reel stops
    stopGapMs: 400, // between one reel stopping and the next
    holdMs: 700, // after the last stop, before the reels burst into coins
    durationMs: 1_000, // after the burst: ~0.3s blast out, 0.2s hang, then the merge
    mergeMs: 500,
    // each reel's multipliers and how often it stops on them
    symbols: [
      { value: 1, weight: 60 },
      { value: 2, weight: 30 },
      { value: 5, weight: 10 },
    ],
    matchBonus: 3, // the sum's multiplier when all three reels match
  },
} as const satisfies EventMeta;
