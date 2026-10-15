import type { EventMeta } from "../../eventMeta";

// bombs lobbed from both corners collide mid-air
export default {
  label: "Mid-Air",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    flightMs: 520,
    clashesMs: [300, 150] as [number, number], // between clashes, quickening
    volleyGapMs: 200,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
