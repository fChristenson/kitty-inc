import type { EventMeta } from "../../eventMeta";

// guns orbit and fire on each worker
export default {
  label: "Orbital Guns",
  style: "gunfire",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    orbitsMs: [420, 260] as [number, number], // each orbit, quickening
    lapsHz: [1.5, 2.5] as [number, number], // laps a second, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
