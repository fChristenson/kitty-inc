import type { EventMeta } from "../../eventMeta";

// the wisp hurtles at the screen and splats on it
export default {
  label: "Splat",
  chance: 0.01,
  values: {
    rushMs: [450, 280] as [number, number], // each bounce off and rush back in
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
