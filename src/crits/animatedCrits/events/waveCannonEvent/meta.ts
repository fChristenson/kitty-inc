import type { EventMeta } from "../../eventMeta";

// sine waves of bullets crash into the bars
export default {
  label: "Wave Cannon",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    volleysMs: [420, 260] as [number, number],
    flightMs: [520, 380] as [number, number],
    levelShare: 0.04,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
