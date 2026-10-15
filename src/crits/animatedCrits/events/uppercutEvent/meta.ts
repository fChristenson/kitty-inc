import type { EventMeta } from "../../eventMeta";

// the rare "Uppercut" event: the wisp uppercuts the clicked floor's income
// bar into the air; it flips and crashes back down with free upgrade levels
export default {
  label: "Uppercut",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    swoopMs: 300, // swooping in under the bar
    riseMs: 360, // the bar flying up, flipping
    hangMs: 110, // hanging at the top
    fallMs: 170, // crashing back down
    holdMs: 600, // after it lands, before the screen unfreezes
    levelShare: 0.1, // free levels, of the floor's current level
    minLevels: 10,
  },
} as const satisfies EventMeta;
