import type { EventMeta } from "../../eventMeta";

// a neutron splits a bomb, whose neutrons split two more, then four, then
// eight, in a doubling chain reaction
export default {
  label: "Fission",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    growMs: 300, // the bombs popping up
    levelShare: 0.01, // levels per split
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
