import type { EventMeta } from "../../eventMeta";

// a gun is hurled round the screen by its own recoil
export default {
  label: "Recoil",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    shotsMs: [300, 130] as [number, number], // between shots, quickening
    finalMs: 260, // the last slug of cash pouring out
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
