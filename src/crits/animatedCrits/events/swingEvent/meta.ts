import type { EventMeta } from "../../eventMeta";

// the rare "Swing" event: the wisp swings like a pendulum, ever wider,
// flinging coins at every top, then lets go into the total and explodes
export default {
  label: "Swing",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    swingMs: [340, 200] as [number, number], // each swing, quickening
    shootMs: 180, // flying from the last top into the total
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
