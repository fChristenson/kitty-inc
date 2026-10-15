import type { EventMeta } from "../../eventMeta";

// the rare "Orbital Strike" event: a reticle locks onto the clicked floor's
// income bar and a beam of light slams down onto it from the sky, blasting it
// up a crit tier
export default {
  label: "Orbital Strike",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    lockMs: 520, // the reticle closing in and locking on
    aimMs: 220, // the thin targeting laser flickering
    beamMs: 260, // the beam blazing after it strikes
    holdMs: 650, // after the strike, before the screen unfreezes
  },
} as const satisfies EventMeta;
