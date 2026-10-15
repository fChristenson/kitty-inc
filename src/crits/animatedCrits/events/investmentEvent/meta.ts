import type { EventMeta } from "../../eventMeta";

// the rare "Investment" event: the button pours coins into the income bar
// until it slams full and pays out, then lights burst out of the bar into the
// button and the floor climbs one crit tier
export default {
  label: "Investment",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    fillMs: 1_000, // the coins filling the bar
    liftMs: 900, // the lights bursting from the bar into the button
    holdMs: 900, // after the promotion lands, before the screen unfreezes
    payouts: 3, // the full bar's payout times this, paid as it slams
  },
} as const satisfies EventMeta;
