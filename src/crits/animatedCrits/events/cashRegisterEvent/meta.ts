import type { EventMeta } from "../../eventMeta";

// a sale rings up, KA-CHING!
export default {
  label: "Cash Register",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    pressesMs: [260, 130] as [number, number], // between key presses, quickening
    gushMs: 500, // the torrent gushing
    travelMs: 460, // each coin's trip up into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
