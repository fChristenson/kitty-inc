import type { EventMeta } from "../../eventMeta";

// bombs whirl off a pinwheel
export default {
  label: "Bomb Pinwheel",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    spinUpMs: 800, // the wheel spinning up
    gapsMs: [220, 100] as [number, number], // between bombs flung, quickening
    flingMs: 320, // each bomb's flight
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
