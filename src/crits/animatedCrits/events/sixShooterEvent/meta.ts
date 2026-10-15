import type { EventMeta } from "../../eventMeta";

// ricochet shots onto empty spots, each a new worker
export default {
  label: "Six-Shooter",
  style: "gunfire",
  reward: "hires",
  chance: 0.01,
  values: {
    drawMs: 250, // the gunslinger rising
    gapsMs: [220, 110] as [number, number], // between shots, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
