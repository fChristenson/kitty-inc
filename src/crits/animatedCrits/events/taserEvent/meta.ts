import type { EventMeta } from "../../eventMeta";

// a taser zaps each worker
export default {
  label: "Taser",
  style: "lightning",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    zapMs: [460, 260] as [number, number], // each worker, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
