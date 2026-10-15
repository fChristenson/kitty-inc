import type { EventMeta } from "../../eventMeta";

// the rare "Supernova" event: the wisp swells and pulses in the middle of the
// screen, collapses and detonates, its shockwave raising every climbable
// worker it sweeps over one perma tier
export default {
  label: "Supernova",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    chargeMs: 750, // swelling and pulsing
    collapseMs: 120, // shrinking to a point
    ringMs: 650, // the shockwave racing out past the screen's corners
    holdMs: 450, // after it's gone, before the screen unfreezes
  },
} as const satisfies EventMeta;
