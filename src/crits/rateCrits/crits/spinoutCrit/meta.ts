import type { CritMeta } from "../../../critKit/meta";

// a whirling disk of stars over every bar sinking into its core, spinning
// faster and faster, then fired down into the bar: it runs flat out,
// easing back to normal
export default {
  label: "Spinout",
  chance: 0.03,
  style: "galaxy",
  // how fast a bar runs at first, easing back to normal over ms (its own
  // over ownMs)
  values: { speed: 3, ms: 25_000, ownMs: 50_000 },
} satisfies CritMeta;
