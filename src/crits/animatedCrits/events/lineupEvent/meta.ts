import type { EventMeta } from "../../eventMeta";

// scattered wisps line up, then fire into the total
export default {
  label: "Lineup",
  chance: 0.01,
  values: {
    alignMs: 320, // snapping into the row
    trembleMs: 220, // the row trembling before it fires
    fireMs: [140, 50] as [number, number], // between shots, quickening
    flyMs: 150, // each wisp's flight into the total
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
