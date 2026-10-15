import type { EventMeta } from "../../eventMeta";

// the floors' screen bows like a trampoline and flings the view up an atrium,
// higher each bounce, a guard at a balcony rail dropped at every top; the
// last bounce flies it through a lit window onto the floors and every bar
// takes its levels
export default {
  label: "Springboard",
  style: "fps",
  reward: "levels",
  chance: 0.01,
  values: {
    bowMs: 220, // the floors' screen bowing before it flings the view up
    flyMs: 0, // the flight through the window is the landing
    levelShare: 0.1, // levels for every bar in view
    levelGapMs: 70, // between the bars' levels, top to bottom
  },
} as const satisfies EventMeta;
