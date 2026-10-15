import type { EventMeta } from "../../eventMeta";

// the rare "Bumpers" event: a ball wisp pings between three bumper wisps,
// ever faster, spraying coins, then all three blow in a huge blast
export default {
  label: "Bumpers",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    launchMs: 240, // the ball's first shot, off the button
    shotMs: [220, 80] as [number, number], // each shot between bumpers, quickening
    chargeMs: 350, // the bumpers trembling before they blow
    holdMs: 500, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
