import type { EventMeta } from "../../eventMeta";

// the rare "Mitosis" event: the wisp splits in two again and again, bouncing
// round the screen, until the swarm blows at once, spraying coins into the
// total
export default {
  label: "Mitosis",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    // each generation's flight before it splits (the last: before it blows)
    genMs: [360, 290, 230, 185, 150, 130],
    holdMs: 450, // the coins hanging after the swarm blows
    mergeMs: 500,
  },
} as const satisfies EventMeta;
