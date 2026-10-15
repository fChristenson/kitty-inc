import type { EventMeta } from "../../eventMeta";

// the rare "Unlock" event, only on a floor one or two below the locked floor:
// its crit's click streams coins into that floor's unlock price, then unlocks
// it for free with its own unlock crit roll
export default {
  label: "Unlock",
  chance: 0.01, // per crit whose special-crit gateway hit
} as const satisfies EventMeta;
