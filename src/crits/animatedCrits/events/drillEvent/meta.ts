import type { EventMeta } from "../../eventMeta";

// the rare "Drill" event: the wisp drills through the clicked floor's income
// bar from the left and bursts out the other side, spraying coins into the
// total
export default {
  label: "Drill",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    approachMs: 240, // rocketing in to the bar
    drillMs: 720, // grinding through it against the resistance
    exitMs: 160, // shooting on off the screen
    holdMs: 450, // the coins hanging after it bursts out
    mergeMs: 500,
  },
} as const satisfies EventMeta;
