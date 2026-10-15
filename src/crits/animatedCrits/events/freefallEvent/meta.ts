import type { EventMeta } from "../../eventMeta";

// the floors' screen folds its top half back flat onto the flight stage's
// sky, the view walks onto it, looks down over its far edge at a white hole
// far below and jumps, crash-landing a tier higher
export default {
  label: "Freefall",
  style: "flight",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    foldMs: 550, // the top half tipping back until it lies flat
    walkMs: 500, // the view rising onto the folded half
    tiltMs: 1100, // walking the length of it to its far edge and tilting down over it at the hole
    jumpMs: 700, // the crouch, the spring up and the drop out over the hole
    flyMs: 300, // the fall toward the hole, until the floors appear in it
  },
} as const satisfies EventMeta;
