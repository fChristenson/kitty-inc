import type { EventMeta } from "../../eventMeta";

// two counter-spinning rings of bombs collide where they cross
export default {
  label: "Collision Course",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    firstMs: 500, // the first pair meeting
    gapsMs: [230, 110] as [number, number], // between collisions, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
