import type { EventMeta } from "../../eventMeta";

// wisps snap through formations, then fire
export default {
  label: "Formation",
  style: "wisp",
  chance: 0.01,
  values: {
    snapMs: 170, // each snap into a formation
    holdShapeMs: 190, // holding it
    fireMs: 260, // each wisp's flight into the total
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
