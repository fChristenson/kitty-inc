import type { EventMeta } from "../../eventMeta";

// a wisp bounces ever higher into the total
export default {
  label: "Trampoline",
  style: "wisp",
  chance: 0.01,
  values: {
    dropMs: 300, // the first drop from the top
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
