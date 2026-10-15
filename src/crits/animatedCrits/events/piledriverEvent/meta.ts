import type { EventMeta } from "../../eventMeta";

// the rare "Piledriver" event: the wisp charges over the top of the screen,
// then plunges straight down through every upgrade button in view, each
// landing free upgrade levels
export default {
  label: "Piledriver",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    chargeMs: 550, // swelling and trembling over the top of the screen
    fallMs: 520, // plunging from there off the bottom, accelerating
    holdMs: 700, // after the crater, before the screen unfreezes
    levelShare: 0.1, // free levels per button, of its floor's current level
    minLevels: 10,
  },
} as const satisfies EventMeta;
