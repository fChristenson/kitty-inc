import type { EventMeta } from "../../eventMeta";

// on the flight stage, chasing a comet the guns pop the chunks it sheds (each
// paying), then lock on and blow it apart from its tail to its head
export default {
  label: "Comet Chase",
  style: "flight",
  reward: "cash",
  chance: 0.01,
  values: {
    payoutsPerChunk: 0.3, // the floor's payouts each chunk pays
    payoutsComet: 2, // the floor's payouts the comet pays
  },
} as const satisfies EventMeta;
