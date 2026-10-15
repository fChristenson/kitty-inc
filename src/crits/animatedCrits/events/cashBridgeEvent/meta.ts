import type { EventMeta } from "../../eventMeta";

// arches of cash span spot to spot
export default {
  label: "Cash Bridge",
  style: "money",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    spansMs: [400, 240] as [number, number], // each span, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
