import type { EventMeta } from "../../eventMeta";

// gears of beams mesh up to the lock and wrench it open
export default {
  label: "Gear Train",
  style: "beam",
  reward: "a free floor",
  chance: 0.01,
  values: {
    clanksMs: [200, 110] as [number, number], // between gears, quickening
    whirlMs: 650,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
