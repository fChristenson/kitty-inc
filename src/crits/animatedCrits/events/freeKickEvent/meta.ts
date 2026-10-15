import type { EventMeta } from "../../eventMeta";

// two shots blocked by the wall, then the top corner
export default {
  label: "Free Kick",
  chance: 0.01,
  values: {
    kickMs: 300, // each shot up into the wall
    reboundMs: 200, // bouncing back off the bottom
    curlMs: 450, // the bending shot into the total
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
