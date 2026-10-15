import type { EventMeta } from "../../eventMeta";

// a cage of lightning snaps shut on the clicked bar
export default {
  label: "Thunderdome",
  style: "lightning",
  reward: "levels + a crit tier",
  chance: 0.01,
  values: {
    formMs: 250, // the cage cracking into being
    holdsMs: [380, 200] as [number, number], // between snaps, quickening
    levelShare: 0.1, // of the bar's levels, per snap
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
