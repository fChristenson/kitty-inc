import type { EventMeta } from "../../eventMeta";

// the rare "Kickback" event: its crit's click streams coins from a random
// 1..maxParticipants of the on-screen workers and managers into the total,
// which is then multiplied by one more than how many took part
export default {
  label: "Kickback",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    // each one streams a full coin burst per tick; more overflows the coin pool
    maxParticipants: 3,
  },
} as const satisfies EventMeta;
