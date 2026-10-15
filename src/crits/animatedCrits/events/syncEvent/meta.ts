import type { EventMeta } from "../../eventMeta";

// a field of spinning, blinking wisps couples up and syncs into unison
// flashes, then streams onto the workers
export default {
  label: "Sync",
  style: "experiment",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    growMs: 250, // the field lighting up
    syncMs: 1500, // random blinks pulling into unison
    dropMs: 380, // each wisp's fall onto its worker
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
