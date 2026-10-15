import type { EventMeta } from "../../eventMeta";

// the rare "Blessing" event: golden glimmers snow down over the clicked
// floor, one settling on each worker, +1 perma tier each
export default {
  label: "Blessing",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    snowMs: 1_500, // how long flakes keep starting to fall
  },
} as const satisfies EventMeta;
