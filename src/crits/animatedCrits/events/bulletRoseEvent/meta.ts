import type { EventMeta } from "../../eventMeta";

// rings of bullets open into a rose
export default {
  label: "Bullet Rose",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    ringsMs: [300, 220] as [number, number], // between rings, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
