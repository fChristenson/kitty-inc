import type { EventMeta } from "../../eventMeta";

// the rare "Paparazzi" event: camera flashes go off round the clicked floor's
// workers, ever faster; each worker caught climbs a perma tier, then every
// camera fires at once
export default {
  label: "Paparazzi",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    flashMs: 1_200, // the random flashes, piling up toward the end
    finalGapMs: 120, // after the last flash, every camera at once
    holdMs: 650, // after that, before the screen unfreezes
  },
} as const satisfies EventMeta;
