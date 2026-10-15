import type { EventMeta } from "../../eventMeta";

// chipped in, two bounces, round the rim, in
export default {
  label: "Hole in One",
  chance: 0.01,
  values: {
    hopMs: [560, 320, 220], // the lob, then each bounce
    rimMs: 420, // whirling round the rim and dropping in
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
