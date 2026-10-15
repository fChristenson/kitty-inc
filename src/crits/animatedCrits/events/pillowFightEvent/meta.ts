import type { EventMeta } from "../../eventMeta";

// a pillow fight fills the screen with feathers, a broom sweeps them onto the
// bar
export default {
  label: "Pillow Fight",
  style: "clutter",
  reward: "levels",
  chance: 0.01,
  values: {
    swingMs: 260, // the pillows swinging in to the first smack
    flutterMs: 650, // each feather drifting down
    dragMs: 120, // each broom stroke's drag (8 strokes)
    liftMs: 60,
    levelShare: 0.12,
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
