import type { EventMeta } from "../../eventMeta";

// crossfire rungs up the building
export default {
  label: "Bullet Ladder",
  style: "gunfire",
  reward: "a free floor",
  chance: 0.01,
  values: {
    rungsMs: [230, 120] as [number, number], // each rung, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
