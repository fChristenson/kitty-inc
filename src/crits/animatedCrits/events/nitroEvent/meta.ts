import type { EventMeta } from "../../eventMeta";

// the floors zoom away into the race; the ship hits a run of gold boost pads,
// each a surge (the view punching wide, speed lines, flames roaring), through
// a tunnel under a building, the last pad cracking a sonic boom, and through
// the finish gate's window onto the floors, every bar in view a crit tier up
export default {
  label: "Nitro",
  style: "road race",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    enterMs: 250, // the floors zooming away into the race
    flyMs: 4100, // the race, until the finish gate's window is close (5s from the click to the crash)
    tierGapMs: 90, // between the bars' crit tiers, top to bottom
  },
} as const satisfies EventMeta;
