import type { EventMeta } from "../../eventMeta";

// the rare "Tidal Wave" event: a wall of water sweeps across the screen,
// lifting floors like the Rising Tide
export default {
  label: "Tidal Wave",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    sweepMs: 1200, // the wave rolling in from one side until it's fully out the other
  },
} as const satisfies EventMeta;
