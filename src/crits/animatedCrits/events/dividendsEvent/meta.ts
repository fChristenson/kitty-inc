import type { EventMeta } from "../../eventMeta";

// the rare "Dividends" event: lights stream from the button into the
// lowest-tier worker in view, which climbs one perma tier, then sprays a coin
// stream into the total
export default {
  label: "Dividends",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    liftMs: 900, // the lights streaming into the worker
    sprayMs: 900, // the worker's coins spraying into the total
    payouts: 3, // the worker's floor's payouts paid into the total
  },
} as const satisfies EventMeta;
