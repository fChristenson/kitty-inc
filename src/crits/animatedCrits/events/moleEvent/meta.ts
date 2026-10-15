import type { EventMeta } from "../../eventMeta";

// a drill bores up out of the floor under each empty spot
export default {
  label: "Mole",
  style: "drill",
  reward: "free hires",
  chance: 0.01,
  values: {
    divesMs: [340, 220] as [number, number], // each dive under a spot, quickening
    boresMs: [280, 180] as [number, number], // each bore up, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
