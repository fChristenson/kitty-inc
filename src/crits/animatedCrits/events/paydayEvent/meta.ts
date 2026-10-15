import type { EventMeta } from "../../eventMeta";

// the rare "Payday" event: every on-screen worker streams coins into the
// clicked floor's button, which fires them into the total, paying the floor's
// payout once per worker
export default {
  label: "Payday",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    gatherMs: 700, // the workers paying into the button
    payoutMs: 700, // the button firing it all into the total
    maxWorkers: 3,
  },
} as const satisfies EventMeta;
