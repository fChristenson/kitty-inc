import type { EventMeta } from "../../eventMeta";

// rings of bullets stop and bloom into rings
export default {
  label: "Bullet Bloom",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    riseMs: 350, // the boss rising
    wavesMs: [480, 400, 320], // between waves, one per wave
    hangMs: 150, // the buds hanging before they bloom
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
