import type { EventMeta } from "../../eventMeta";

// the rare "Ping Pong" event: a wisp bounces between the clicked floor's
// income bar and the roof (the bar above, if open), each bar hit knocking
// coins into the total; pays once per bar hit
export default {
  label: "Ping Pong",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    approachMs: 180, // flying in to its first hit
    firstRallyMs: 120, // between the first two hits, shrinking to
    lastRallyMs: 55, // between the last two
    holdMs: 450, // the coins hanging after the smash
    mergeMs: 500,
  },
} as const satisfies EventMeta;
