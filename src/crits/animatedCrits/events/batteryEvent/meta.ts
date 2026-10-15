import type { EventMeta } from "../../eventMeta";

// every bar fires a laser blast
export default {
  label: "Battery",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    gapsMs: [260, 110] as [number, number], // between shots, quickening
    aimMs: 120, // each shot's aim laser
    fireMs: 160, // each shot blazing
    volleyMs: 300, // every bar firing at once
    levelShare: 0.06, // of a bar's levels, per shot
    holdMs: 700,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
