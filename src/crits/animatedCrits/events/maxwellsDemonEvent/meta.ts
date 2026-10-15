import type { EventMeta } from "../../eventMeta";

// a demon at a gate sorts a box of hot and cold glimmers, then the hot gas
// blasts onto the workers
export default {
  label: "Maxwell's Demon",
  style: "experiment",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    growMs: 250, // the box snapping up
    sortMs: 1300, // the demon sorting the gas
    slamMs: 180, // the gate slammed shut before the wall bursts
    burstMs: 380, // each glimmer's flight onto its worker
    gapMs: 90, // between workers
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
