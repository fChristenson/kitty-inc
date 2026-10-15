import type { EventMeta } from "../../eventMeta";

// a neon sign buzzes on letter by letter
export default {
  label: "Neon Sign",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    gapsMs: [300, 170] as [number, number], // between letters, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
