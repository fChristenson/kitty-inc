import type { EventMeta } from "../../eventMeta";

// the rare "Missile Barrage" event: a volley of wisp missiles streaks up into
// every income bar in view, each hit landing free upgrade levels
export default {
  label: "Missile Barrage",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    gapMs: 75, // between launches
    flightMs: 420, // each missile's flight
    holdMs: 650, // after the last hit, before the screen unfreezes
    levelShare: 0.1, // free levels per bar, of its floor's current level
    minLevels: 10,
  },
} as const satisfies EventMeta;
