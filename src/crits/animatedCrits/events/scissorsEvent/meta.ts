import type { EventMeta } from "../../eventMeta";

// beams open like scissors up to the total
export default {
  label: "Scissors",
  style: "beam",
  chance: 0.01,
  values: {
    swingMs: 320, // the blades swinging in to cross
    openMs: 1_200, // the blades swinging open
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
