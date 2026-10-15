import type { EventMeta } from "../../eventMeta";

// a shooter knocks marbles out of a ring
export default {
  label: "Ringer",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    shotsMs: [300, 200] as [number, number], // between shots, quickening
    flickMs: 220, // each shot's flick
    knockMs: 260, // a marble flying out
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
