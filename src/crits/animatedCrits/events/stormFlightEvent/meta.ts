import type { EventMeta } from "../../eventMeta";

// on the flight stage, lightning arcs from wisp to wisp through a storm,
// every strike blowing its wisp, quicker and quicker
export default {
  label: "Storm Flight",
  style: "flight",
  reward: "perma tier",
  chance: 0.01,
} as const satisfies EventMeta;
