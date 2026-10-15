import type { EventMeta } from "../../eventMeta";

// a squid wisp jets up the screen squirting cash
export default {
  label: "Squid",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    spurtsMs: [320, 170] as [number, number], // each spurt, quickening
    squirtMs: 200, // each squirt pouring
    travelMs: 450, // each coin's trip back
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
