import type { EventMeta } from "../../eventMeta";

// the rare "Stream" event: like Spray, but the coins flow as a river winding
// and looping across the screen into the total; the button pours until its
// head arrives, so the whole event lasts ~2x travelMs
export default {
  label: "Stream",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    travelMs: 8_00, // each coin's trip down the river
  },
} as const satisfies EventMeta;
