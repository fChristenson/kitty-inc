import type { CritMeta } from "../../../critKit/meta";

// aim lasers flicker out of its own readout and sweep the building, locking
// onto every other readout one by one, each tether blazing up into a beam;
// then every beam pulses back into its own readout: its next payouts each
// also pay out every tethered floor once
export default {
  label: "Tethers",
  chance: 0.03,
  style: "beam",
  // its own bar's payouts that each also pay out every tethered floor
  values: { payouts: 6 },
} satisfies CritMeta;
