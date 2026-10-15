import type { CritMeta } from "../../../critKit/meta";

// a chain of blasts snaking down the bars, each one it passes running
// three times as fast, fading back
export default {
  label: "Afterburn",
  chance: 0.03,
  style: "explosion",
  values: {
    // a bar this many times as fast, fading back to its own speed over ms
    speed: 3,
    ms: 20_000,
  },
} satisfies CritMeta;
