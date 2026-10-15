import type { EventMeta } from "../../eventMeta";

// bombs stuck on the workers go off in a chain
export default {
  label: "Sticky Bombs",
  style: "explosion",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    flickMs: 90, // between bombs flicked out
    flyMs: 260, // each bomb's flight
    fuseMs: 450, // every fuse fizzing
    chainMs: 500, // the chain of blasts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
