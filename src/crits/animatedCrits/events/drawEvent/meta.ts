import type { EventMeta } from "../../eventMeta";

// the rare "Draw" event: like Spray, but the stream draws the crit's own
// 5/25/125 and the payout is multiplied by it
export default {
  label: "Draw",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    streamMs: 600, // how long the number takes to draw
    durationMs: 1_600, // stream, ~0.3s last coin out, 0.4s hang, then the merge
    mergeMs: 500,
  },
} as const satisfies EventMeta;
