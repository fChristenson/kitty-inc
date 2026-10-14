import type { CritMeta } from "../../../critKit/meta";

// wisps circling the lock, closing in faster and faster as it charges, then
// slamming in: the floor bursts open and each wisp moves in as a worker
export default {
  label: "Spark Plug",
  chance: 0.03,
  style: "charge",
  // the wisps, each hired onto the floor it opens
  values: { hires: 3 },
  isNew: true,
} satisfies CritMeta;
