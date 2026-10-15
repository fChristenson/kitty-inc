import type { EventMeta } from "../../eventMeta";

// a spider on legs of lightning climbs to the lock
export default {
  label: "Volt Spider",
  style: "lightning",
  reward: "a free floor",
  chance: 0.01,
  values: {
    stepsMs: [220, 110] as [number, number], // each stride, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
