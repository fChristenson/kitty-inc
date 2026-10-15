import type { EventMeta } from "../../eventMeta";

// the floors zoom away into a night street race already flat out; cat-wisps
// wait at glowing stops down both pavements, hopping ever higher as the car
// nears; it never stops, swerving past each at full speed as the cat leaps
// aboard (a flash, a chime, a jolt: a free hire), the stops coming faster;
// a crowd at the last stop all leap on at once, and the car, trailing its
// tail of cat-wisps, shoots through the finish gate's window onto the floors
export default {
  label: "Carpool",
  style: "road race",
  reward: "hires",
  chance: 0.01,
  values: {
    enterMs: 250, // the floors zooming away into the race
    flyMs: 3200, // the race, until the finish gate's window is close
    // each cat landing aboard (its hire), from the click, quickening
    stopsMs: [600, 980, 1310, 1590, 1830, 2030, 2200, 2350],
    crowdMs: 2750, // the crowd at the last stop all landing aboard
    crowdCats: 5, // cats in the crowd, a hire each
    leapMs: 150, // a cat's leap from its stop onto the passing car
    mergeMs: 700, // the car shooting through the window, the floors filling the screen
    hireGapMs: 70, // between the hires' cheers once back on the floors
  },
} as const satisfies EventMeta;
