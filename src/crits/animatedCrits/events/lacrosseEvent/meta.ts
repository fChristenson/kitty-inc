import type { EventMeta } from "../../eventMeta";

// passes caught at the bars' ends
export default {
  label: "Lacrosse",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    passesMs: [260, 160] as [number, number], // each pass, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
