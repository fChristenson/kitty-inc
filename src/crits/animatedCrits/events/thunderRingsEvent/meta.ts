import type { EventMeta } from "../../eventMeta";

// strikes blast out rings of lightning
export default {
  label: "Thunder Rings",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    strikesMs: [380, 220] as [number, number], // between strikes, quickening
    ringMs: 420, // each ring swelling out
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
