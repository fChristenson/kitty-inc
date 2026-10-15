import type { EventMeta } from "../../eventMeta";

// the rare "Wrecking Ball" event: the wisp drops like a heavy ball onto the
// clicked floor's income bar and bounces on it, each hit an explosion that
// lands free upgrade levels
export default {
  label: "Wrecking Ball",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    dropMs: 340, // falling from above the screen onto the bar
    bounce: 0.7, // each bounce's speed, of the hit before (a rubber ball)
    chargeMs: 450, // resting on the bar, charging up its leap
    jumpMs: 340, // leaping up jumpHeight px
    jumpHeight: 420,
    slamMs: 130, // slamming back down onto the bar
    holdMs: 600, // after the slam, before the screen unfreezes
    levelShare: 0.1, // free levels in all, of the floor's current level
    minLevels: 10,
  },
} as const satisfies EventMeta;
