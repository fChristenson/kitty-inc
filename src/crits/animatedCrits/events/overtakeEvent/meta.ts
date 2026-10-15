import type { EventMeta } from "../../eventMeta";

// the floors zoom away into a race flat out behind three rival ships; the
// ship tucks into each one's slipstream and slingshots past, quicker each
// time, and leads through the finish gate's window onto the floors, every bar
// in view a crit tier up
export default {
  label: "Overtake",
  style: "road race",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    enterMs: 250, // the floors zooming away into the race
    flyMs: 4100, // the race, until the finish gate's window is close (5s from the click to the crash)
    tierGapMs: 90, // between the bars' crit tiers, top to bottom
  },
} as const satisfies EventMeta;
