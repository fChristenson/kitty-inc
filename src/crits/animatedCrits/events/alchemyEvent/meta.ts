import type { EventMeta } from "../../eventMeta";

// the rare "Alchemy" event: the button pours coins into a cauldron that
// bubbles up and shoots lights into the lowest-tier worker on the floor: it
// climbs one perma tier and the floor pays out
export default {
  label: "Alchemy",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    brewMs: 1_400, // coins pouring in, the brew bubbling up
    shootMs: 800, // the lights shooting into the worker
    holdMs: 800, // after the worker lands, before the screen unfreezes
    payouts: 2, // the floor's payouts paid with the promotion
  },
} as const satisfies EventMeta;
