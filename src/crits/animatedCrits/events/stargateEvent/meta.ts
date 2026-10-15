import type { EventMeta } from "../../eventMeta";

// a ring of beams dials open the locked floor
export default {
  label: "Stargate",
  style: "beam",
  reward: "unlock",
  chance: 0.01,
  values: {
    riseMs: 400, // the ring rising
    locksMs: [280, 140] as [number, number], // each chevron lock, quickening
    fireMs: 400, // the gate firing
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
