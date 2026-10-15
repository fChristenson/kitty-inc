import type { EventMeta } from "../../eventMeta";

// sprinkler heads burst open over the bars one after another
export default {
  label: "Deluge",
  style: "spray",
  reward: "levels",
  chance: 0.01,
  values: {
    headsMs: [240, 110] as [number, number], // between heads bursting, quickening
    sprayMs: 520, // each head's spray
    levelShare: 0.04,
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
