import type { CritMeta } from "../../../critKit/meta";

// a drill punching a row of holes up into the total, hopping from hole to
// hole faster and faster, then grinding through its middle
export default {
  label: "Perforator",
  chance: 0.03,
  style: "drill",
  isNew: true,
} satisfies CritMeta;
