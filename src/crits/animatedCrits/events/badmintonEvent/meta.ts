import type { EventMeta } from "../../eventMeta";

// shuttlecocks smashed onto spots
export default {
  label: "Badminton",
  style: "wisp",
  reward: "hires",
  chance: 0.01,
  values: {
    lobsMs: [380, 240] as [number, number], // each lob, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
