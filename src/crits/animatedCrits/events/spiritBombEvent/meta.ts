import type { EventMeta } from "../../eventMeta";

// rivers of cash swell an orb that's hurled onto the bar
export default {
  label: "Spirit Bomb",
  style: "mix",
  reward: "a crit tier + cash",
  chance: 0.01,
  values: {
    gatherMs: 1200, // the rivers swelling the orb
    throwMs: 260, // hurled down onto the bar
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
