import type { CritMeta } from "../../../critKit/meta";

// a tilted spiral galaxy spinning up beside the buttons, slinging a knot of
// stars onto each, then the whole of it onto its own; each tap of theirs
// then also pays out the next floor round the building in turn
export default {
  label: "Milky Way",
  chance: 0.03,
  style: "galaxy",
  values: {
    // Star taps left on each button it lands on, twice as many on its own
    taps: 3,
  },
} satisfies CritMeta;
