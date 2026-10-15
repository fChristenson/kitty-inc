import type { EventMeta } from "../../eventMeta";

// the rare "Line Clear" event: blocks hard-drop and stack into four full
// rows, which clear at once in a blast of coins into the total
export default {
  label: "Line Clear",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    // when each piece slams down, ever quicker
    landAt: [300, 510, 690, 850, 990, 1_110, 1_215, 1_310, 1_395, 1_475],
    blinkMs: 260, // the full rows blinking before they clear
    holdMs: 450, // the coins hanging after the clear
    mergeMs: 500,
  },
} as const satisfies EventMeta;
