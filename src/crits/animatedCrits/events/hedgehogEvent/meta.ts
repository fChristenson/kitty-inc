import type { EventMeta } from "../../eventMeta";

// a rolling wisp fires a bullet ring at the top of every bounce
export default {
  label: "Hedgehog",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    bouncesMs: [440, 300] as [number, number], // each bounce, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
