import type { CritMeta } from "../../../critKit/meta";

// a time bomb under the total counting down, beeping faster and faster,
// until it blows up into the readout
export default {
  label: "Tick Tock",
  chance: 0.03,
  style: "explosion",
} satisfies CritMeta;
