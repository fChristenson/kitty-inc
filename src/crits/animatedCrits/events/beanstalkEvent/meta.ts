import type { EventMeta } from "../../eventMeta";

// the rare "Beanstalk" event: a vine of light winds up round the locked floor
// and the one above it, unlocking both
export default {
  label: "Beanstalk",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    growMs: 2_400, // the vine climbing from the top floor up past the locked one
    holdMs: 500, // after it blooms, before the screen unfreezes
    secondUnlockMs: 450, // between the two floors unlocking
  },
} as const satisfies EventMeta;
