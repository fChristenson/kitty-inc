import type { CritMeta } from "../../../critKit/meta";

// a wisp looping through twin rings over and under every bar, each pass
// banking a double payout
export default {
  label: "Shortcut",
  chance: 0.03,
  style: "portal",
  values: {
    // each pass banks one payout this many times as big
    payout: 2,
  },
} satisfies CritMeta;
