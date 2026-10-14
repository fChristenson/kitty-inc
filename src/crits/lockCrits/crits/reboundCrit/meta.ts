import type { CritMeta } from "../../../critKit/meta";

// a wisp ricocheting round the locked floor, splitting in two then four,
// slamming it open, its new bar running twice as fast for a while
export default {
  label: "Rebound",
  chance: 0.03,
  style: "bounce",
} satisfies CritMeta;
