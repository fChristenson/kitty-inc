import type { CritMeta } from "../../../critKit/meta";

// a chain of blasts snaking down the bars, each one it passes running
// three times as fast, fading back
export default {
  label: "Afterburn",
  chance: 0.03,
  style: "explosion",
} satisfies CritMeta;
