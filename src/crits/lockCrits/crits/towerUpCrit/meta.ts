import type { CritMeta } from "../../../critKit/meta";

// glitter blown all over the locked floor hopping itself into a teetering
// tower that slams down through the lock, its bits raining workers onto the
// floor it opened
export default {
  label: "Tower Up",
  chance: 0.03,
  style: "clutter",
  // workers hired on the opened floor
  values: { hires: 3 },
} satisfies CritMeta;
