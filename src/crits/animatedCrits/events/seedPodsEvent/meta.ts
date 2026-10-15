import type { EventMeta } from "../../eventMeta";

// bomb pods burst in a chain up to the lock, flinging seed bombs
export default {
  label: "Seed Pods",
  style: "explosion",
  reward: "a free floor",
  chance: 0.01,
  values: {
    growMs: 360, // the pods swelling up
    fuseMs: 380, // the first pod's fuse after that
    seedMs: [380, 240] as [number, number], // each pod's seeds in flight, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
