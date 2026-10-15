import type { EventMeta } from "../../eventMeta";

// the rare "Mentor" event: the top-tier worker in view streams lights into
// the lowest-tier one, which climbs up to two tiers
export default {
  label: "Mentor",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    streamMs: 1800, // the lights streaming over; a tier halfway and one at the end
    holdMs: 700, // after the last tier, before the screen unfreezes
  },
} as const satisfies EventMeta;
