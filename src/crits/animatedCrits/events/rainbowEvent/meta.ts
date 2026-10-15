import type { EventMeta } from "../../eventMeta";

// a wisp arcs over, laying a rainbow of cash
export default {
  label: "Rainbow",
  chance: 0.01,
  values: {
    streamMs: 900, // the bands pouring
    travelMs: 900, // each coin's trip over the arch
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
