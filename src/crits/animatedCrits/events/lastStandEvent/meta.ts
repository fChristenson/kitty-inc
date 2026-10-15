import type { EventMeta } from "../../eventMeta";

// a gunner guns down waves of wisps
export default {
  label: "Last Stand",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    wavesMs: [550, 450] as [number, number], // between waves, quickening
    approachMs: 700, // each raider's charge
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
