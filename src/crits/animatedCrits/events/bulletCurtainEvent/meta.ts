import type { EventMeta } from "../../eventMeta";

// curtains of bullets rise into the bars
export default {
  label: "Bullet Curtain",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    riseMs: 300, // the guns rising
    gapsMs: [360, 200] as [number, number], // between volleys, quickening
    levelShare: 0.05, // of the bar's levels, per volley
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
