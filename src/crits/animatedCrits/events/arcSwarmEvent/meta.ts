import type { EventMeta } from "../../eventMeta";

// a swarm webbed by lightning dives onto the workers
export default {
  label: "Arc Swarm",
  style: "lightning",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    swarmMs: 650, // the swarm weaving before the first dive
    divesMs: [260, 140] as [number, number], // between dives, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
