import type { EventMeta } from "../../eventMeta";

// a beam draws a seven-pointed star round each worker
export default {
  label: "Star Polygon",
  style: "beam",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    edgesMs: [80, 45] as [number, number], // each edge, the first star to the last
    overlap: 0.6, // how far through a star the next one starts
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
