import type { EventMeta } from "../../eventMeta";

// ranging shells bracket the clicked bar over and short, then the battery
// pounds it in salvos
export default {
  label: "Fire for Effect",
  style: "gunfire",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    readyMs: 150, // before the first ranging shot
    rangeGapMs: [340, 220] as [number, number], // between ranging shots, quickening
    flightMs: 420, // each shell's flight
    salvoGapMs: 240, // between salvos
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
