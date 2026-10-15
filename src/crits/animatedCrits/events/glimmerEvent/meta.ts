import type { EventMeta } from "../../eventMeta";

// the rare "Glimmer" event: its crit's click streams coins into a golden
// light on the left of the floor, which then sweeps across it, boosting and
// promoting one perma tier every worker and manager it passes that isn't at
// the top tier yet
export default {
  label: "Glimmer",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    sweepMs: 2_000,
    // then hops to the floor above or below and sweeps it right to left
    moveFloorChance: 0.5,
  },
} as const satisfies EventMeta;
