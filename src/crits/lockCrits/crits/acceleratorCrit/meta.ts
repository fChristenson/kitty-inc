import type { CritMeta } from "../../../critKit/meta";

// twin rings open facing each other at the dark locked floor's two ends; a
// wisp laps the floor through the lock, into the far ring and out of the near
// one, faster every pass, more joining in, till they smash the lock open and
// stream into the new floor's button: each of its next taps also boosts every
// worker on the floor below
export default {
  label: "Accelerator",
  chance: 0.03,
  style: "portal",
  // charged taps on the opened floor's button
  values: { taps: 5 },
  isNew: true,
} satisfies CritMeta;
