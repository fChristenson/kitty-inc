import type { EventMeta } from "../../eventMeta";

// bullets swirl into a vortex of cash
export default {
  label: "Bullet Funnel",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    gapsMs: [170, 70] as [number, number], // between volleys, quickening
    flightMs: 560,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
