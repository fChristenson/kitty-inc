import type { EventMeta } from "../../eventMeta";

// three nozzles arc jets of cash onto the lock
export default {
  label: "Fire Brigade",
  style: "mix",
  reward: "a free floor and cash",
  chance: 0.01,
  values: {
    opensMs: [380, 260] as [number, number], // between nozzles opening
    travelMs: 520, // a jet's flight to the lock
    blastMs: 300, // all three blasting before it bursts
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
