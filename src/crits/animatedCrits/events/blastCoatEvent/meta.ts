import type { EventMeta } from "../../eventMeta";

// a nozzle sprays a coat of gold glitter along each bar, then the coat goes
// off in a blast rolling along each bar the way it was sprayed
export default {
  label: "Blast Coat",
  style: "spray",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    arriveMs: 200, // the nozzle dropping in
    sweepMs: 300, // the first bar's sweep, quickening
    hopMs: 100, // the hop to the next bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
