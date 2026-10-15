import type { EventMeta } from "../../eventMeta";

// the flowing-cash events on src/crits/animatedCrits/wispCover, poured like
// Stream's river src/crits/animatedCrits/events/fireHoseEvent: a whipping jet
// of cash gushes into the total
export default {
  label: "Fire Hose",
  chance: 0.01,
  values: {
    sprayMs: 1_500, // the hose gushing
    travelMs: 800, // each coin's trip out the jet and round into the total
  },
} as const satisfies EventMeta;
