import type { EventMeta } from "../../eventMeta";

// the rare "Bowling" event: the wisp rolls along the clicked floor like a
// bowling ball, knocking every worker flying; each lands and climbs one perma
// tier
export default {
  label: "Bowling",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    rollMs: 650, // the ball crossing the screen
    flyMs: 600, // each knocked worker's flip, up and back down
    holdMs: 500, // after the ball's gone and the last lands
  },
} as const satisfies EventMeta;
