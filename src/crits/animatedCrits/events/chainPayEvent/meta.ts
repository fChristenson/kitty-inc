import type { EventMeta } from "../../eventMeta";

// the rare "Chain Pay" event: a coin stream hops from the button through
// on-screen workers into the total; the n-th worker reached pays the floor's
// payout n times over
export default {
  label: "Chain Pay",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    hopMs: 450, // each hop from one stop to the next
    payoutMs: 700, // the last worker firing it all into the total
    maxWorkers: 8,
  },
} as const satisfies EventMeta;
