import type { EventMeta } from "../../eventMeta";

// zigzag stitches down, then unzip up into the total
export default {
  label: "Zipper",
  chance: 0.01,
  values: {
    stitchMs: [170, 70] as [number, number], // each stitch across
    unzipMs: 380, // ripping back up into the total
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
