import type { EventMeta } from "../../eventMeta";

// a prod jabs each bar
export default {
  label: "Cattle Prod",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    hopMs: 160, // the prod's hop to each bar
    jabMs: [90, 35] as [number, number], // between jabs, quickening to a buzz
    levelShare: 0.02, // of a bar's levels, per jab
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
