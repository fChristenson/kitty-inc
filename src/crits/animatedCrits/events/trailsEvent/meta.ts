import type { EventMeta } from "../../eventMeta";

// the rare "Trails" event: like Stream, but many short streams leave the
// button one after another, each winding into the total
export default {
  label: "Trails",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    spreadMs: 900, // from the first trail leaving the button to the last
    pourMs: 200, // how long the button pours each trail
    travelMs: 400, // each coin's trip down its trail
  },
} as const satisfies EventMeta;
