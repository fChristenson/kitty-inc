import type { CritMeta } from "../../../critKit/meta";

// a row of cannon wisps beside the buttons firing rolling broadsides into
// them, quicker each, until all fire at once: each of its next taps also pays
// out the floor with the fewest workers
export default {
  label: "Broadside",
  chance: 0.03,
  style: "gunfire",
  // salvo taps on each button, twice as many on its own
  values: { taps: 3 },
  isNew: true,
} satisfies CritMeta;
