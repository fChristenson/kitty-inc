import type { EventMeta } from "../../eventMeta";

// a scissoring ring of beams breathes and crushes the lock
export default {
  label: "Hoberman",
  style: "beam",
  reward: "a free floor",
  chance: 0.01,
  values: {
    breathsMs: [520, 340] as [number, number], // each breath, quickening
    openMs: 200,
    crushMs: 170,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
