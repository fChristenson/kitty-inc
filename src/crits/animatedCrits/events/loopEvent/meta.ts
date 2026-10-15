import type { EventMeta } from "../../eventMeta";

// the rare "Loop" event: the wisp flies in, loops a wide circle round the
// screen's middle, then flies straight up into the total and explodes
export default {
  label: "Loop",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    entryMs: 220, // flying in onto the circle
    loopMs: 1_800, // the loops, speeding up
    shootMs: 200, // flying straight up into the total
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
