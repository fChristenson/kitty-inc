import type { EventMeta } from "../../eventMeta";

// a pool mirrors the screen as cash pours in
export default {
  label: "Reflecting Pool",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    riseMs: 400,
    streamsMs: [220, 120] as [number, number], // between streams, quickening
    drainMs: 300,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
