import type { EventMeta } from "../../eventMeta";

// a drill skewers a row of workers one after another like a kebab
export default {
  label: "Kebab",
  style: "drill",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    approachMs: 260, // the drill flying in from the side
    stallMs: 450, // the first bite's stall (later ones half as long)
    boreMs: 600, // the first bore (later ones half as long)
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
