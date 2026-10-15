import type { EventMeta } from "../../eventMeta";

// the screen's storeys collapse into a heap and spring back
export default {
  label: "Collapse",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    gapsMs: [240, 110] as [number, number], // between storeys giving way
    fallMs: 200, // each storey's drop
    springMs: 260, // springing back up
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
