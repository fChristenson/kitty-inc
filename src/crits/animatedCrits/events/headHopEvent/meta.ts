import type { EventMeta } from "../../eventMeta";

// the rare "Head Hop" event: the wisp hops across the clicked floor's
// workers' heads, each squashing and climbing a perma tier
export default {
  label: "Head Hop",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    entryMs: 300, // dropping in onto the first head
    firstHopMs: 260, // the first hop, shrinking to
    lastHopMs: 140, // the last
    launchMs: 280, // rocketing up off the last head
    holdMs: 650, // after the last head, before the screen unfreezes
  },
} as const satisfies EventMeta;
