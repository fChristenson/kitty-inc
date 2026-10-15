import type { EventMeta } from "../../eventMeta";

// a fountain of bullets arcing up and raining onto the bars
export default {
  label: "Bullet Fountain",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    fireMs: 1050, // the fountain, quickening
    flightMs: [620, 460] as [number, number], // each bullet's arc, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
