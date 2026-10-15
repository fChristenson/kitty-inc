import type { EventMeta } from "../../eventMeta";

// orbiting bombs spiral in and crash into the button
export default {
  label: "Orbital Decay",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    firstMs: 700, // the first bomb's spiral in
    hitsMs: [220, 120] as [number, number], // between impacts, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
