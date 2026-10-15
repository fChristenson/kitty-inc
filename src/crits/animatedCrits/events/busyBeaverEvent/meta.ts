import type { EventMeta } from "../../eventMeta";

// a Turing machine head runs the 4-state busy beaver, then its 1s fly onto
// the empty spots
export default {
  label: "Busy Beaver",
  style: "experiment",
  reward: "free hires",
  chance: 0.01,
  values: {
    bootMs: 200, // the tape and head appearing
    stepMs: [22, 8] as [number, number], // each of the 107 steps, quickening
    flyMs: 320, // each mark's flight onto its spot
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
