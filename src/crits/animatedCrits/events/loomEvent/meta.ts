import type { EventMeta } from "../../eventMeta";

// a shuttle wisp weaves cash through a warp of rivers
export default {
  label: "Loom",
  style: "mix",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    warpMs: 400, // the warp strung
    warpTravelMs: 600, // each warp coin's trip
    passesMs: [320, 170] as [number, number], // each shuttle pass, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
