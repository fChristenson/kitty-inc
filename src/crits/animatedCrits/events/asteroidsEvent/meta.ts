import type { EventMeta } from "../../eventMeta";

// the rare "Asteroids" event: the wisp blasts shot after shot at tumbling
// gold rocks, cracking big ones in two and bursting small ones into coins
// that sweep into the total
export default {
  label: "Asteroids",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    firstShotMs: 300, // the rocks tumbling in before the first shot
    gapMs: [200, 70] as [number, number], // between shots, quickening
    travelMs: 90, // each shot's flight to its rock
    holdMs: 450, // after the last rock blows, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
