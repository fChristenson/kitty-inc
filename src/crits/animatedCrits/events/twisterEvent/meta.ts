import type { EventMeta } from "../../eventMeta";

// the rare "Twister" event: a funnel of coins zigzags across the screen
// through the workers in view, sucking a short stream out of each, then spins
// up into the total; pays the floor's payout once per worker swept up
export default {
  label: "Twister",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    formMs: 300, // the funnel spinning up on the button
    speed: 700, // its sweep, in floor px per second, kept within:
    minSweepMs: 2_000,
    maxSweepMs: 9_000,
    suckMs: 420, // each worker's stream into the funnel
    payoutMs: 700, // the funnel lifting off into the total
    maxWorkers: 10,
  },
} as const satisfies EventMeta;
