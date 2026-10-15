import type { EventMeta } from "../../eventMeta";

// the rare "Hunt" event button, only armed while the mouse (src/spawn/mouse)
// is on screen. Clicking it streams coins into the mouse (same
// freeze/stream/sound as boostEvent), which then grows, turns red and
// restarts its time on screen; clicking that hunted mouse gives its normal
// boost plus a guaranteed "special crit crit" bonus tier (5x/25x/125x total
// income, weighted by the crit tier odds, see
// crits/floorCrits/bonusTierReward).
export default {
  label: "Hunt",
  chance: 0.065, // per crit whose special-crit gateway hit, mouse on screen
  values: {
    // the mouse is out ~5s of every ~32.5s (src/spawn/mouse), so ~6.5x the other
    // events' 0.01 makes Hunt land about as often overall
  },
} as const satisfies EventMeta;
