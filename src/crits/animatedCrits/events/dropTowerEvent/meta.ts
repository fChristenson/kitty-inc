import type { EventMeta } from "../../eventMeta";

// a rider drops and brakes on each bar
export default {
  label: "Drop Tower",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    launchMs: 280, // shot up to the top
    hangMs: 200, // hanging at the top
    dropsMs: [380, 220] as [number, number], // each drop, quickening
    brakeMs: 140, // braking on a bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
