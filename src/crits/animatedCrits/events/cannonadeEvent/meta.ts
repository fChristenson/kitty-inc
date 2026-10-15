import type { EventMeta } from "../../eventMeta";

// a cannon shells the bars
export default {
  label: "Cannonade",
  style: "explosion",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    rollMs: 300, // the cannon rolling out
    gapsMs: [450, 300] as [number, number], // between shots, quickening
    flightMs: 650, // each shell's flight
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
