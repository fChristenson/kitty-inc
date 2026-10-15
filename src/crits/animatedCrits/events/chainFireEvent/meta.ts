import type { EventMeta } from "../../eventMeta";

// guns fire bar to bar up to the lock
export default {
  label: "Chain Fire",
  style: "gunfire",
  reward: "levels + a free floor",
  chance: 0.01,
  values: {
    hopsMs: [140, 80] as [number, number], // from a burst landing to the next firing, quickening
    shotGapMs: 60,
    lockGapMs: 45,
    levelShare: 0.04,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
