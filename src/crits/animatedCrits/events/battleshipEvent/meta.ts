import type { EventMeta } from "../../eventMeta";

// shots sink two hidden ships
export default {
  label: "Battleship",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    shotsMs: [170, 90] as [number, number], // between shots, quickening
    flightMs: 300, // each shot's flight
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
