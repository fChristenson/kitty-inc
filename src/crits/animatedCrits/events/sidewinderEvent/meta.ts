import type { EventMeta } from "../../eventMeta";

// a wisp snake slithers and strikes
export default {
  label: "Sidewinder",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    slitherMs: 1300,
    strikeMs: 260,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
