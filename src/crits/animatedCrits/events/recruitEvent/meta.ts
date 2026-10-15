import type { EventMeta } from "../../eventMeta";

// the rare "Recruit" event: lights stream into an empty spot on a floor in
// view and form a new worker there, a free hire
export default {
  label: "Recruit",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    streamMs: 1_800, // the lights streaming in and the worker forming
    holdMs: 900, // after the new worker lands, before the screen unfreezes
  },
} as const satisfies EventMeta;
