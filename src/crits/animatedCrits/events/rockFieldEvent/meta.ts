import type { EventMeta } from "../../eventMeta";

// on the flight stage, glitter rocks rush in and twin beams crack each into
// chunks that burst one after another, each paying; the last huge rock splits
// eight ways
export default {
  label: "Rock Field",
  style: "flight",
  reward: "cash",
  chance: 0.01,
  values: {
    payoutsPerChunk: 0.2, // the floor's payouts each burst chunk pays
  },
} as const satisfies EventMeta;
