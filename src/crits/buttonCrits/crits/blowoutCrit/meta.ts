import type { CritMeta } from "../../../critKit/meta";

// coins spurting out of every button, higher and higher as the pressure
// builds, until they all blow in one huge geyser; each tap of it then spills
// a level onto the floors above and below
export default {
  label: "Blowout",
  chance: 0.03,
  style: "money",
  // spill taps per multiple of the crit, twice as many on its own button
  values: { taps: 0.5 },
} satisfies CritMeta;
