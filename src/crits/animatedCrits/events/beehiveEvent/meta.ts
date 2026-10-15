import type { EventMeta } from "../../eventMeta";

// a swarm buzzes worker to worker
export default {
  label: "Beehive",
  style: "wisp",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    flightsMs: [360, 200] as [number, number], // swooping to each worker
    buzzesMs: [320, 160] as [number, number], // whirling on each head
    burstMs: 300, // the swarm bursting outward
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
