import type { EventMeta } from "../../eventMeta";

// Dijkstra's front floods a road map from the button; wisps race the shortest
// ways to the workers
export default {
  label: "Shortest Path",
  style: "experiment",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    appearMs: 150, // the road map fading in
    waveMs: 1100, // the front reaching the farthest worker
    rideMs: 260, // each wisp racing down its shortest path
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
