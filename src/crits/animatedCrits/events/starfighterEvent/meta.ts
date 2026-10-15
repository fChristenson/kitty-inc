import type { EventMeta } from "../../eventMeta";

// on the flight stage, wisps rush in out of the distance and the view's guns
// lock on and blast them, then a big one
export default {
  label: "Starfighter",
  style: "flight + explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    flyMs: 2100, // the dogfight, until the floors appear far ahead
    approachMs: 560, // each wisp's rush in from the distance to being shot
    lockMs: 220, // the reticle closing on a wisp before the guns fire
    boltMs: 150, // each laser bolt's flight to its wisp
    levelShare: 0.03, // free levels on the floor per wisp shot down (the big one counts thrice)
  },
} as const satisfies EventMeta;
