import type { CritMeta } from "../../../critKit/meta";

// a slab pressing on a wisp at every bar's end until they crumble, each
// bar then faster for good; rarer, being for good
export default {
  label: "Compressor",
  chance: 0.01,
  style: "crush",
  values: {
    // a bar this many times as fast for good (its own ownSpeed)
    speed: 1.2,
    ownSpeed: 1.4,
  },
} satisfies CritMeta;
