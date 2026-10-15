import type { EventMeta } from "../../eventMeta";

// a kingfisher dives into each bar
export default {
  label: "Kingfisher",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    divesMs: [520, 320] as [number, number], // each perch, bob and dive, quickening
    finalMs: 420, // the last dive into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
