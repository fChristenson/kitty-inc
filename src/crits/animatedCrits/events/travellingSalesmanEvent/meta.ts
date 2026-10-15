import type { EventMeta } from "../../eventMeta";

// a tangled tour through a dozen cities uncrosses itself by 2-opt, then
// cinches onto the clicked bar
export default {
  label: "Travelling Salesman",
  style: "experiment",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    growMs: 300, // the cities and the tangled loop appearing
    solveMs: 1200, // every swap, quickening
    lapMs: 350, // a wisp racing round the finished tour
    cinchMs: 200, // the loop cinching onto the bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
