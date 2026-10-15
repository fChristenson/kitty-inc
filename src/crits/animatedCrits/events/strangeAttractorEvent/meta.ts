import type { EventMeta } from "../../eventMeta";

// a wisp draws the Lorenz butterfly, which bursts onto the workers
export default {
  label: "Strange Attractor",
  style: "experiment",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    traceMs: 1600, // drawing the butterfly, ever faster
    gatherMs: 120, // before it bursts
    flyMs: 320, // each glimmer's flight onto its worker
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
