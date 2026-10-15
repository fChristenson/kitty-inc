import type { EventMeta } from "../../eventMeta";

// the rare "Gatling" event: wisps fire in like gatling bullets, each hitting
// the button and knocking coins out round it, which merge into the total
export default {
  label: "Gatling",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    fireMs: 1_100, // the burst of fire, speeding up
    travelMs: 80, // each bullet's flight to the button
    holdMs: 450, // the coins hanging after the last round
    mergeMs: 500,
  },
} as const satisfies EventMeta;
