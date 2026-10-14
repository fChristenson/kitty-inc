import type { CritMeta } from "../../../critKit/meta";

// a pen wisp cutting a gem of glitter over every button, each tap of it then
// levelling the building's lowest floor too
export default {
  label: "Gem Cutter",
  chance: 0.03,
  style: "drawing",
  // gem taps per multiple of the crit, twice as many on its own button
  values: { taps: 0.5 },
} satisfies CritMeta;
