import type { EventMeta } from "../../eventMeta";

// the rare "Fireflies" event: one firefly per worker a floor in view is
// missing drifts in and wanders the floor, then each settles into an empty
// spot as a new worker: it fills up to its cap
export default {
  label: "Fireflies",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    enterMs: 600, // a firefly drifting in from the screen's edge
    wanderMs: 1_000, // them all wandering the floor before the first settles
    settleMs: 450, // a firefly gliding into its spot
    gapMs: 300, // between one settling and the next
    holdMs: 700, // after the last worker forms, before the screen unfreezes
  },
} as const satisfies EventMeta;
