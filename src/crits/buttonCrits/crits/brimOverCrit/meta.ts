import type { CritMeta } from "../../../critKit/meta";

// a river of coins pouring onto the buttons, brimming over from each onto
// the next: each tap of them then also pays out the top floor
export default {
  label: "Brim Over",
  chance: 0.03,
  style: "money",
  // pour taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
