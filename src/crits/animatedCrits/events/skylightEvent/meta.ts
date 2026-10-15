import type { EventMeta } from "../../eventMeta";

// a drill bores up through the ceiling and light pours onto the workers
export default {
  label: "Skylight",
  style: "drill",
  reward: "worker perma",
  chance: 0.01,
  values: {
    approachMs: 240,
    stallMs: 550,
    boreMs: 1200,
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
