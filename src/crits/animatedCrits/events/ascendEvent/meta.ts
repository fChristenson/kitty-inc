import type { EventMeta } from "../../eventMeta";

// the rare "Ascend" event: a wisp zigzags up the building touching each
// income bar in view, +1 perma tier each
export default {
  label: "Ascend",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    hopMs: 450, // each hop from one bar to the next
    maxFloors: 6, // the most bars it touches
  },
} as const satisfies EventMeta;
