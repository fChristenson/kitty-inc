import type { EventMeta } from "../../eventMeta";

// the rare "Chain Reaction" event: mines pop up over the screen and blow one
// after another from the button, each spraying coins that then sweep into the
// total
export default {
  label: "Chain Reaction",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    armMs: 320, // the mines popping up before the button blows
    holdMs: 450, // after the last blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
