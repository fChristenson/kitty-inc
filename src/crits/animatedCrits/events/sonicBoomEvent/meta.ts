import type { EventMeta } from "../../eventMeta";

// the rare "Sonic Boom" event: the wisp revs up near the middle of the
// screen, then bursts off it leaving a ball and a trail of money behind that
// merge into the total
export default {
  label: "Sonic Boom",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    glideMs: 360, // gliding in and pulling up
    revMs: 520, // revving up
    burstMs: 130, // tearing off the screen
    holdMs: 450, // the coins hanging after it's gone
    mergeMs: 500,
  },
} as const satisfies EventMeta;
