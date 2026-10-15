import type { EventMeta } from "../../eventMeta";

// the floors zoom away into a race already flat out; the street twists into
// hairpins between the blocks, each quicker and tighter: the wisp-car throws
// itself sideways into each in a long drift, sparks and smoke pouring off it,
// the view swinging round, every exit a punch of speed; the last a full 180
// onto the finish gate, the locked floor's window, which it smashes through,
// bursting the floor open for free
export default {
  label: "Drift",
  style: "road race",
  reward: "free floors",
  chance: 0.01,
  values: {
    enterMs: 250, // the floors zooming away into the race
    flyMs: 3600, // the race, until the finish gate's window is close
    firstBendMs: 450, // the car throwing itself into the first hairpin, from the click
    bendsMs: [460, 420, 380, 340], // each hairpin's drift, quicker each time
    gapsMs: [300, 250, 200, 170], // the straights between drifts (the last before the 180)
    finalMs: 620, // the full 180 drift onto the finish gate
    mergeMs: 700, // the car smashing through the locked floor's window, the floors filling the screen
  },
} as const satisfies EventMeta;
