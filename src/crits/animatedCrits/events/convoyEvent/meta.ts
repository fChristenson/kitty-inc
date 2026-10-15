import type { EventMeta } from "../../eventMeta";

// on the flight stage, a snaking train of cargo wisps sweeps across in depth
// and the guns strafe it tail to head, every car bursting in a chain, the
// engine last
export default {
  label: "Convoy",
  style: "flight",
  reward: "levels",
  chance: 0.01,
  values: {
    levelShare: 0.012, // free levels on the floor per car
  },
} as const satisfies EventMeta;
