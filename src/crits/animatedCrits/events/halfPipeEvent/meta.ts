import type { EventMeta } from "../../eventMeta";

// a river rides a half-pipe and launches
export default {
  label: "Half-Pipe",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    passesMs: [420, 260] as [number, number], // each pass, quickening
    launchMs: 420, // the launch into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
