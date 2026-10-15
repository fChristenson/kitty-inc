import type { EventMeta } from "../../eventMeta";

// a swarm of tiny drills riddles each bar
export default {
  label: "Woodworm",
  style: "drill",
  reward: "levels",
  chance: 0.01,
  values: {
    approachMs: 180,
    boresMs: [320, 200] as [number, number], // each bar's boring, quickening
    levelShare: 0.03, // per bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
