import type { EventMeta } from "../../eventMeta";

// a snow cannon buries the lock in falling gold mist
export default {
  label: "Snow Cannon",
  style: "spray",
  reward: "a free floor",
  chance: 0.01,
  values: {
    burstsMs: [420, 300] as [number, number], // each burst, shortening
    gapMs: 140, // between bursts
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
