import type { EventMeta } from "../../eventMeta";

// two wisps leapfrog across, then into the total
export default {
  label: "Leapfrog",
  chance: 0.01,
  values: {
    vaultMs: [300, 170] as [number, number], // each vault, quickening
    finalMs: 320, // both leaping into the total
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
