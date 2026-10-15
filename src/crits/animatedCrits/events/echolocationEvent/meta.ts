import type { EventMeta } from "../../eventMeta";

// a bat pings and swoops onto spots
export default {
  label: "Echolocation",
  style: "wisp",
  reward: "hires",
  chance: 0.01,
  values: {
    pingMs: 160, // each ping sweeping out
    swoopsMs: [200, 120] as [number, number], // each swoop, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
