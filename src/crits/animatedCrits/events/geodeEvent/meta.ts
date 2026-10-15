import type { EventMeta } from "../../eventMeta";

// a drill grinds into a geode that cracks open into cash
export default {
  label: "Geode",
  style: "drill",
  reward: "cash",
  chance: 0.01,
  values: {
    approachMs: 260, // the drill screaming in
    stallMs: 700, // stalled on the crust
    boreMs: 1300, // boring through
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
