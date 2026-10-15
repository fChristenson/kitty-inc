import type { EventMeta } from "../../eventMeta";

// the rare "Upgrade" event: its crit's click streams coins into that floor's
// income bar, then promotes the floor's permanent crit tier to the crit's
// tier (or one above its own); never on a top-tier floor
export default {
  label: "Upgrade",
  chance: 0.01, // per crit whose special-crit gateway hit
} as const satisfies EventMeta;
