import type { EventMeta } from "../../eventMeta";

// a Ferris wheel of cash drops its cars onto empty spots
export default {
  label: "Ferris Wheel",
  style: "mix",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    buildMs: 500, // the wheel built
    gapsMs: [260, 140] as [number, number], // between cars letting go, quickening
    spinOffMs: 250, // the wheel spinning off
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
