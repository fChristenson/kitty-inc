import type { EventMeta } from "../../eventMeta";

// the button sprinkles drops that land as coins
export default {
  label: "Sprinkler",
  chance: 0.01,
  values: {
    sprayMs: 1_300, // sweeping, before the last whirl
    emitMs: [80, 40] as [number, number], // between drops, quickening
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
