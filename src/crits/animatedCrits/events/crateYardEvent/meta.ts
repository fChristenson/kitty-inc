import type { EventMeta } from "../../eventMeta";

// the floors' screen slides aside onto a yard of crates; the view leans out
// of cover as guards pop up one by one, a big one behind a crate wall blown
// apart; the back shutter rolls up on the floors
export default {
  label: "Crate Yard",
  style: "fps",
  reward: "levels",
  chance: 0.01,
  values: {
    slideMs: 250, // the floors' screen sliding aside
    flyMs: 0, // the rush through the shutter is the landing
    levelShare: 0.1, // levels for every bar in view
    levelGapMs: 70, // between the bars' levels, top to bottom
  },
} as const satisfies EventMeta;
