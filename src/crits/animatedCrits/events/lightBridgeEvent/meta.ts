import type { EventMeta } from "../../eventMeta";

// arches of light to each spot
export default {
  label: "Light Bridge",
  style: "beam",
  reward: "hires",
  chance: 0.01,
  values: {
    archesMs: [440, 280] as [number, number], // each bridge built and run
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
