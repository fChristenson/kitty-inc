import type { EventMeta } from "../../eventMeta";

// the rare "Hourglass" event: the button pours coins into an hourglass that
// flips over, and they trickle out of it into the total; pays `seconds` of
// the building's income
export default {
  label: "Hourglass",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    fillMs: 900, // the button filling the hourglass
    flipMs: 500, // it turning over
    drainMs: 1_400, // the coins trickling out into the total
    seconds: 60,
  },
} as const satisfies EventMeta;
