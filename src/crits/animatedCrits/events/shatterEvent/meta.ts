import type { EventMeta } from "../../eventMeta";

// the screen shatters like glass
export default {
  label: "Shatter",
  style: "shatter",
  reward: "cash",
  chance: 0.01,
  values: {
    knocksMs: [180, 520, 820], // each knock, the last shattering it
    fallMs: 900, // the shards blowing out and falling away
    holdMs: 200,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
