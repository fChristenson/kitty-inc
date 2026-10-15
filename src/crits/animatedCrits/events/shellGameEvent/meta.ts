import type { EventMeta } from "../../eventMeta";

// the rare "Shell Game" event: three gold cups shuffle the wisp round, ever
// faster, flicking out coins, then fly off and the found wisp blows, and the
// coins sweep into the total
export default {
  label: "Shell Game",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    dropMs: 380, // the cups popping up and the middle one slamming down
    swapMs: [250, 100] as [number, number], // each swap, quickening
    revealMs: 450, // the cups flying off and the found wisp swelling
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
