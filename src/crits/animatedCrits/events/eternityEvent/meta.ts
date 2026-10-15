import type { EventMeta } from "../../eventMeta";

// the rare "Eternity" event: the wisp races twice round a huge infinity sign
// across the screen, shedding coins, then flies up into the total and
// explodes
export default {
  label: "Eternity",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    entryMs: 200, // shooting up onto the sign's tip
    passMs: 700, // each pass round the sign
    shootMs: 200, // flying up into the total
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
