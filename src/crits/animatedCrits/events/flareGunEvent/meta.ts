import type { EventMeta } from "../../eventMeta";

// flares hang over empty spots and drop
export default {
  label: "Flare Gun",
  style: "gunfire",
  reward: "hires",
  chance: 0.01,
  values: {
    gapsMs: [220, 120] as [number, number], // between flares, quickening
    hangMs: 250, // each flare hanging
    dropMs: 250, // each flare's drop
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
