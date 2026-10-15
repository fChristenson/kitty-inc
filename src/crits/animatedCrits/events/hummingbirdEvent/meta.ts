import type { EventMeta } from "../../eventMeta";

// a wisp hovers and darts stop to stop
export default {
  label: "Hummingbird",
  style: "wisp",
  chance: 0.01,
  values: {
    dartMs: 70, // each dart between stops
    hoverMs: [260, 110] as [number, number], // each hover, first to last
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
