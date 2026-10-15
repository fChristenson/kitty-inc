import type { EventMeta } from "../../eventMeta";

// an arc boils a pool of cash
export default {
  label: "Arc Furnace",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    fillMs: 380, // the pool filling
    geyserMs: [260, 150] as [number, number], // between geysers, quickening
    eruptMs: 380, // the pool's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
