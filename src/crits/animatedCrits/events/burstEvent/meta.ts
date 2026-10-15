import type { EventMeta } from "../../eventMeta";

// the rare "Burst" event: its crit's click freezes the screen while its
// button blows out one explosion of coins and bills over the whole screen;
// they hang there, then merge into the total, paying the floor's income times
// its floor number
export default {
  label: "Burst",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    durationMs: 1_000, // ~0.3s blast out, 0.2s hang, then the merge
    mergeMs: 500, // the last part, where the coins fly into the total
  },
} as const satisfies EventMeta;
