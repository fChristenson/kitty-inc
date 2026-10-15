import type { EventMeta } from "../../eventMeta";

// a fountain of bombs rains down in chains and clusters
export default {
  label: "Bomb Fountain",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    gapsMs: [140, 70] as [number, number], // between bombs, quickening
    flightMs: 550, // each bomb's arc
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
