import type { EventMeta } from "../../eventMeta";

// cannon shells burst into clusters over the bars
export default {
  label: "Confetti Cannon",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    volleysMs: [380, 240] as [number, number], // between volleys, quickening
    flightMs: 340, // each shell's flight
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
