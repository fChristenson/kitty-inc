import type { EventMeta } from "../../eventMeta";

// the rare "Popcorn" event: a row of kernels heats up along the clicked floor
// and pops at random, ever faster, each leaping up and bursting into coins
// that then sweep into the total
export default {
  label: "Popcorn",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    heatMs: 500, // the kernels heating up before the first can pop
    popMs: 1_000, // the random pops, piling up toward the end
    jumpMs: 300, // each popped kernel's leap up to where it bursts
    holdMs: 450, // after the last burst, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
