import type { CritMeta } from "../../../critKit/meta";

// a slab pressing on a wisp at every bar's end until they crumble, each
// bar then faster for good; rarer, being for good
export default {
  label: "Compressor",
  chance: 0.01,
  style: "crush",
} satisfies CritMeta;
