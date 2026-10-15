import type { EventMeta } from "../../eventMeta";

// glitter stars orbit a lit bomb, spinning faster and tighter as its fuse
// burns, inner ones swallowed in pops; it blows and flings stars onto the
// bars
export default {
  label: "Nova Disk",
  style: "galaxy",
  reward: "levels",
  chance: 0.01,
  values: {
    growMs: 250, // the bomb and its disk swelling in
    fuseMs: 1300, // the fuse, the disk quickening and pulling in
    levelShare: 0.004, // levels per star landing on a bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
