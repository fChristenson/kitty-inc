import type { EventMeta } from "../../eventMeta";

// a shell of cash bursts into streamers onto empty spots
export default {
  label: "Chrysanthemum",
  style: "money",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    riseMs: 350, // the shell rising
    streamMs: 500, // each streamer pouring
    droopMs: 600, // each streamer's droop
    holdMs: 500,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
