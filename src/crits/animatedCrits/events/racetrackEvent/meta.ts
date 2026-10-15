import type { EventMeta } from "../../eventMeta";

// the rare "Racetrack" event: the wisp laps a track round the screen's edges,
// ever faster, drifting coins off every corner, then peels off into the total
// and explodes
export default {
  label: "Racetrack",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    entryMs: 150, // racing in onto the track
    raceMs: 1_600, // the laps, speeding up
    shootMs: 140, // peeling off into the total
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
