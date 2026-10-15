import type { CritMeta } from "../../../critKit/meta";

// a bolt cracking down onto every bar and crackling along it, each then
// running twice as fast for a while
export default {
  label: "Overclock",
  chance: 0.03,
  style: "lightning",
  values: {
    // a bar this many times as fast for ms
    speed: 2,
    ms: 30_000,
  },
} satisfies CritMeta;
