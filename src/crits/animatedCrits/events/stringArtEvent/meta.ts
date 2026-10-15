import type { EventMeta } from "../../eventMeta";

// strings of light shoot pin to rail like string art, bowing four curves
// between two bars, then fold flat onto them
export default {
  label: "String Art",
  style: "beam",
  reward: "levels",
  chance: 0.01,
  values: {
    pinMs: 250, // the pins and rails popping up
    weaveMs: 1150, // from the first string to the last
    shootMs: 110, // each string shooting across
    blazeMs: 250, // the finished web blazing
    foldMs: 260, // the strings folding down onto their bars
    levelShare: 0.012, // levels per string
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
