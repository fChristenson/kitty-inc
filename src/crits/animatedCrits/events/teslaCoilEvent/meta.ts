import type { EventMeta } from "../../eventMeta";

// a coil throws ever longer arcs
export default {
  label: "Tesla Coil",
  style: "lightning",
  reward: "levels + worker tiers",
  chance: 0.01,
  values: {
    pulseGapsMs: [360, 200] as [number, number], // between pulses, quickening
    arcMs: 160, // each pulse's arcs crackling
    overloadMs: 320, // the coil overloading
    levelShare: 0.04, // of a bar's levels, per arc
    holdMs: 700,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
