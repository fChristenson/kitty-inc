import type { EventMeta } from "../../eventMeta";

// a hexagon of beams snaps tighter
export default {
  label: "Hex Ring",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    formMs: 400, // the corners flying out
    gapsMs: [300, 140] as [number, number], // between snaps, quickening
    crushMs: 250, // the crush to a point
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
