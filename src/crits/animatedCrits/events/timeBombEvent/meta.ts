import type { EventMeta } from "../../eventMeta";

// a ticking bomb pumps the bars with every tick
export default {
  label: "Time Bomb",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    flyMs: 350, // the bomb flying in
    ticksMs: [300, 260, 210, 170, 130, 100, 80, 120], // between ticks; the last is the blast
    levelShare: 0.03, // of the bar's levels, per tick
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
