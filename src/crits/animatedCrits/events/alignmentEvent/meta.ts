import type { EventMeta } from "../../eventMeta";

// orbiting wisps line up, then fire
export default {
  label: "Alignment",
  style: "wisp",
  chance: 0.01,
  values: {
    orbitMs: 1_500, // circling until they line up
    lineMs: 200, // lined up, blazing
    fireMs: 260, // each wisp's flight into the total
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
