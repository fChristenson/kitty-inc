import type { CritMeta } from "../../../critKit/meta";

// a time bomb of light beside its button beeping ever faster, every button
// glowing on each beep, then a blast wave rolling up and down the column:
// each of its next taps also levels the floor three above
export default {
  label: "Tick Tick Boom",
  chance: 0.03,
  style: "explosion",
  // boom taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
