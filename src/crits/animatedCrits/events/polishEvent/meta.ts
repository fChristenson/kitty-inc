import type { EventMeta } from "../../eventMeta";

// the rare "Polish" event: lights swirl round the upgrade button and buff it
// until it shines, granting free upgrade levels
export default {
  label: "Polish",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    swirlMs: 1_800, // the lights swirling in and buffing the button
    holdMs: 1_200, // after the shine lands, before the screen unfreezes
    levelShare: 0.1, // free levels, of the floor's current level
    minLevels: 10,
  },
} as const satisfies EventMeta;
