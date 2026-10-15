import type { EventMeta } from "../../eventMeta";

// a swarm of bombs circles and dives into the locked floor
export default {
  label: "Swarm Strike",
  style: "explosion",
  reward: "unlock",
  chance: 0.01,
  values: {
    circleMs: 700, // the swarm circling
    divesMs: [160, 80] as [number, number], // between dives, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
