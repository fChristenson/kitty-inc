import type { EventMeta } from "../../eventMeta";

// on the flight stage, a lattice of wisps joined by beams looms in and blows
// in a wave corner to corner, then its core
export default {
  label: "Battlecruiser",
  style: "flight",
  reward: "levels",
  chance: 0.01,
  values: {
    levelShare: 0.01, // free levels on the floor per node
  },
} as const satisfies EventMeta;
