import type { CritMeta } from "../../../critKit/meta";

// a scanner beam sweeping the unlock price until it shatters to a
// fraction of it
export default {
  label: "Clearance",
  chance: 0.03,
  style: "beam",
} satisfies CritMeta;
