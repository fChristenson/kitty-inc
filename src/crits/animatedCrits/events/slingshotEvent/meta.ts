import type { EventMeta } from "../../eventMeta";

// a wisp drawn back, banks off two walls
export default {
  label: "Slingshot",
  style: "wisp",
  chance: 0.01,
  values: {
    pullMs: 900, // drawn back
    flightMs: 650, // let go, off both walls and into the total
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
