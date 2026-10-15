import type { CritMeta } from "../../../critKit/meta";

// a jigsaw strewn over the locked floor snapping itself together over the
// lock, edge first, until the last piece slams in and bursts it open: each
// of the new floor's next taps also arms a crit on the floor below it
export default {
  label: "Jigsaw",
  chance: 0.03,
  style: "clutter",
  // puzzle taps on the opened floor's button
  values: { taps: 3 },
} satisfies CritMeta;
