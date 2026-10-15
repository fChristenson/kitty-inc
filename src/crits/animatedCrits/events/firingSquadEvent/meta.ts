import type { EventMeta } from "../../eventMeta";

// a line of gunmen fires volleys into the bars
export default {
  label: "Firing Squad",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    formMs: 350, // the line forming
    gapsMs: [380, 220] as [number, number], // between volleys, quickening
    levelShare: 0.05, // of the bar's levels, per volley
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
