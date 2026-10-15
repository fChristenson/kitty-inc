import type { EventMeta } from "../../eventMeta";

// the rare "Conveyor" event: glimmer hooks glide in straight along a rail,
// one per worker a floor in view is missing, and drop each onto the floor: it
// fills up to its worker cap
export default {
  label: "Conveyor",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    crossMs: 900, // a hook gliding the floor's whole width
    staggerMs: 300, // between one hook setting off and the next
    holdMs: 700, // after the last worker lands, before the screen unfreezes
  },
} as const satisfies EventMeta;
