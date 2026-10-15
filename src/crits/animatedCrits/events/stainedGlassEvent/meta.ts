import type { EventMeta } from "../../eventMeta";

// the screen turns into a stained-glass window that light floods through
export default {
  label: "Stained Glass",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    leadMs: 250, // the leading creeping over the screen
    shineMs: 1_000, // light flooding pane after pane
    blazeMs: 280, // the window blazing white and clearing
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
