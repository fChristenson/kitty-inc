import type { EventMeta } from "../../eventMeta";

// a tower of turrets fires at the workers
export default {
  label: "Turret Tower",
  style: "gunfire",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    aimMs: 110, // each turret's aim
    turretsMs: [230, 130] as [number, number], // between turrets, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
