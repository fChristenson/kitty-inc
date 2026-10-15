import type { EventMeta } from "../../eventMeta";

// the rare "Rocket" event: the button pours coins into a rocket on the
// clicked floor that launches up through the floors in view and bursts into a
// coin firework that merges into the total; pays once more per floor it flies
// past
export default {
  label: "Rocket",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    fillMs: 900, // the button filling the rocket
    flyMs: 450, // its flight up to the burst
    durationMs: 1_000, // after the burst: blast out, hang, then the merge
    mergeMs: 500,
  },
} as const satisfies EventMeta;
