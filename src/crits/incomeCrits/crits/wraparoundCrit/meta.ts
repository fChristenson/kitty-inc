import type { CritMeta } from "../../../critKit/meta";

// a wisp looping through twin rings either side of the total, faster and
// faster, a share every pass through the readout
export default {
  label: "Wraparound",
  chance: 0.03,
  style: "portal",
} satisfies CritMeta;
