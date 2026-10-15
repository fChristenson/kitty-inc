import type { EventMeta } from "../../eventMeta";

// the rare "Meteor Shower" event: 3-6 shooting stars streak down one after
// another, each striking a different worker, which climbs one perma tier
export default {
  label: "Meteor Shower",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    minMeteors: 3,
    maxMeteors: 6,
    gapMs: 260, // between one meteor's launch and the next
    streakMs: 450, // each meteor coming down from above the screen into its worker
    holdMs: 800, // after the last strike, before the screen unfreezes
  },
} as const satisfies EventMeta;
