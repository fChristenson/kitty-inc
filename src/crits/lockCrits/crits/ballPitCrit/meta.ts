import type { CritMeta } from "../../../critKit/meta";

// glowing balls pouring into the dark locked floor and ricocheting round it,
// faster and fuller till it bursts open and they bounce out onto its button:
// the opened floor's next payouts each arm a crit on its button
export default {
  label: "Ball Pit",
  chance: 0.03,
  style: "bounce",
  // payouts arming a crit on the opened floor's button, per multiple
  values: { payouts: 3 },
} satisfies CritMeta;
