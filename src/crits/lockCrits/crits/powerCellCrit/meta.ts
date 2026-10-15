import type { CritMeta } from "../../../critKit/meta";

// a core on the lock charged by beams from the locked floor's corners
// until it bursts the floor open: its new bar overclocked
export default {
  label: "Power Cell",
  chance: 0.03,
  style: "charge",
} satisfies CritMeta;
