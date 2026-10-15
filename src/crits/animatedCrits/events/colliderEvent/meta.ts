import type { EventMeta } from "../../eventMeta";

// two wisps race round a ring and collide
export default {
  label: "Collider",
  style: "wisp",
  chance: 0.01,
  values: {
    runMs: 1_400, // racing round the ring
    dashMs: 160, // dashing in to collide
    debrisMs: 320, // the debris flying out
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
