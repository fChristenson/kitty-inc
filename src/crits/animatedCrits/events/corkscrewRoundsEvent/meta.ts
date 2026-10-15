import type { EventMeta } from "../../eventMeta";

// helix streams of bullets
export default {
  label: "Corkscrew Rounds",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    shotMs: 45, // between pairs
    flightMs: 520, // each round's flight across
    volleysMs: [140, 80] as [number, number], // between volleys, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
