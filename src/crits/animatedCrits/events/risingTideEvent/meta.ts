import type { EventMeta } from "../../eventMeta";

// the rare "Rising Tide" event: blue water floods up the building, lifting
// every floor in view to the highest floor tier among them
export default {
  label: "Rising Tide",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    riseMs: 2_200, // the tide rising from below the screen to above it
    fadeMs: 400, // it fading away once risen
    holdMs: 600, // after it fades, before the screen unfreezes
  },
} as const satisfies EventMeta;
