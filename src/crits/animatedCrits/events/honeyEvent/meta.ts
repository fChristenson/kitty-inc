import type { EventMeta } from "../../eventMeta";

// a thread of cash drizzles down like honey, coiling into heaps on the bars
export default {
  label: "Honey",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    poursMs: [520, 320] as [number, number], // each heap, quickening
    swingMs: 110, // the thread swinging on to the next heap
    settleMs: 100, // the last coins landing before the heaps lift
    flightMs: 350, // each coin's slurp into the total
    levelShare: 0.1, // of each bar's levels
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
