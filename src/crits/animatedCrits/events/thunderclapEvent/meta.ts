import type { EventMeta } from "../../eventMeta";

// the rare "Thunderclap" event: two wisps smash together on the clicked
// floor's income bar and the shockwave gives every income bar in view free
// upgrade levels
export default {
  label: "Thunderclap",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    rushMs: 600, // the wisps rushing in from the sides
    waveMs: 500, // the shockwave racing up and down the screen
    holdMs: 600, // after it fades, before the screen unfreezes
    levelShare: 0.1, // free levels per floor, of its current level
    minLevels: 10,
  },
} as const satisfies EventMeta;
