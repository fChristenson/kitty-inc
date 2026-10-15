import type { EventMeta } from "../../eventMeta";

// cash gushes into a drum that rocks, spins it into a whirling ring, then
// peels it off the top into the total
export default {
  label: "Spin Cycle",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    pourMs: 320, // the gush into the drum
    rockMs: 400, // the drum rocking the pool
    spinMs: 800, // spinning up
    liftMs: 340, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
