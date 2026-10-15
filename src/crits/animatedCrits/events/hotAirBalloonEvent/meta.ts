import type { EventMeta } from "../../eventMeta";

// a balloon of cash floats up to the locked floor
export default {
  label: "Hot Air Balloon",
  style: "mix",
  reward: "an unlock + cash",
  chance: 0.01,
  values: {
    blastsMs: [260, 220, 190, 160], // before each burner blast
    liftMs: 650, // the flight up to the floor
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
