import type { EventMeta } from "../../eventMeta";

// a juggler tosses lit bombs onto the bars
export default {
  label: "Bomb Juggler",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    juggleMs: 800, // the juggling
    tossMs: [260, 180] as [number, number], // between tosses, quickening
    flightMs: 300, // each toss's flight
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
