import type { EventMeta } from "../../eventMeta";

// the rare "Renovate" event: its crit's click streams coins into that floor's
// "Lvl N" label, then lands one regular crit tier on the floor (x5/x25/x125,
// weighted by the crit tier odds)
export default {
  label: "Renovate",
  chance: 0.01, // per crit whose special-crit gateway hit
} as const satisfies EventMeta;
