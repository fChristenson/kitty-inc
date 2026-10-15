import type { EventMeta } from "../../eventMeta";

// a recoiling gun sprays cones of cash
export default {
  label: "Blunderbuss",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    shotsMs: [380, 240] as [number, number], // between shots, quickening
    kickMs: 200, // each recoil
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
