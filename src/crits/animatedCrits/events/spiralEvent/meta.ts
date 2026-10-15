import type { EventMeta } from "../../eventMeta";

// the rare "Spiral" event: the wisp flies in and loops a wide spiral into the
// screen's middle, shedding coins, then shoots up into the total and explodes
export default {
  label: "Spiral",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    spiralMs: 1_500, // from flying in to reaching the middle
    chargeMs: 150, // hanging in the middle, trembling
    shootMs: 140, // shooting up into the total
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
