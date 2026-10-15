import type { EventMeta } from "../../eventMeta";

// the floors zoom away into a race already flat out; the street throws up
// ramps over chasms between the blocks, each higher and coming quicker: the
// wisp-car launches off each at full speed, hangs with the view punching wide
// and slams down on the far side, every landing a perma tier; the last a mega
// jump over a whole gap between buildings, then through the finish gate's
// window onto the floors
export default {
  label: "Stunt Jump",
  style: "road race",
  reward: "perma tiers",
  chance: 0.01,
  values: {
    enterMs: 250, // the floors zooming away into the race
    flyMs: 4100, // the race, until the finish gate's window is close (5s from the click to the crash)
    firstJumpMs: 750, // the first ramp's launch, from the click
    jumpGapsMs: [820, 700, 620], // between launches, quicker each time (the last before the mega jump)
    airMs: [320, 380, 430], // each small jump's time in the air, longer each time
    holdMs: 820, // the mega jump's hang in the air
    mergeMs: 700, // the car shooting into the gate's window, the floors filling the screen
    promoteGapMs: 60, // between the workers' boosts once back on the floors
  },
  isNew: true,
} as const satisfies EventMeta;
