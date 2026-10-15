import type { EventMeta } from "../../eventMeta";

// the rare "Burrow" event: the wisp falls onto the clicked floor's upgrade
// button and bores in, bending it down at the middle until it explodes,
// bursting money into the total
export default {
  label: "Burrow",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    fallMs: 260, // falling onto the button
    pushMs: 680, // boring in, bending it ever deeper
    holdMs: 450, // the coins hanging after it blows
    mergeMs: 500,
  },
} as const satisfies EventMeta;
