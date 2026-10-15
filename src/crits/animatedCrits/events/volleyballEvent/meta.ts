import type { EventMeta } from "../../eventMeta";

// player wisps bump, set and spike a ball onto the empty spots over a net of
// light
export default {
  label: "Volleyball",
  style: "bounce",
  reward: "free hires",
  chance: 0.01,
  values: {
    growMs: 250, // the net and players popping up
    legMs: 240, // the serve or bounce over, and the bump (the set is a bit quicker)
    spikeMs: 150, // the spike onto the spot
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
