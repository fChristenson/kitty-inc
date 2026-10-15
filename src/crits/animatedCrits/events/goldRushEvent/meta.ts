import type { EventMeta } from "../../eventMeta";

// a pan of cash is swirled and nuggets flicked onto empty spots
export default {
  label: "Gold Rush",
  style: "mix",
  reward: "free hires and cash",
  chance: 0.01,
  values: {
    panMs: 600, // filling and swirling the pan
    flicksMs: [240, 130] as [number, number], // between nuggets, quickening
    flightMs: 420, // a nugget's flight
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
