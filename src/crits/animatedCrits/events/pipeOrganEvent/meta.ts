import type { EventMeta } from "../../eventMeta";

// chords blast cash out of organ pipes
export default {
  label: "Pipe Organ",
  style: "mix",
  reward: "crit tiers + cash",
  chance: 0.01,
  values: {
    riseMs: 500, // the pipes rising
    chordsMs: [420, 300] as [number, number], // between chords, quickening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
