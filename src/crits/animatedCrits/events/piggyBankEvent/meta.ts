import type { EventMeta } from "../../eventMeta";

// the rare "Piggy Bank" event: the button streams coins into a piggy bank
// that swells and wiggles, then bursts, showering the screen with coins that
// merge into the total
export default {
  label: "Piggy Bank",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    fillMs: 900, // the button filling the piggy
    durationMs: 1_000, // after the burst: ~0.3s blast out, 0.2s hang, then the merge
    mergeMs: 500,
    rewardMultiplier: 3, // on top of the floor's income times its floor number
  },
} as const satisfies EventMeta;
