import type { EventMeta } from "../../eventMeta";

// tendrils charge a core that fires into the lock
export default {
  label: "Ion Cannon",
  style: "lightning",
  reward: "a free floor",
  chance: 0.01,
  values: {
    chargeMs: [230, 90] as [number, number], // between tendrils, quickening
    aimMs: 220,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
