import type { EventMeta } from "../../eventMeta";

// a nesting doll wisp opens doll after doll onto empty spots
export default {
  label: "Matryoshka",
  style: "wisp",
  reward: "hires",
  chance: 0.01,
  values: {
    dropMs: 350, // the doll dropping in
    opensMs: [300, 160] as [number, number], // between openings, quickening
    flyMs: 300, // each child's flight
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
