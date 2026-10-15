import type { EventMeta } from "../../eventMeta";

// the floors' screen swings open like saloon doors onto a western street, a
// countdown, the bandit in the road draws and shoots the view, which staggers
// and pitches forward into a hole in the road, falling through it onto the
// floors
export default {
  label: "High Noon",
  style: "flight",
  reward: "levels",
  chance: 0.01,
  values: {
    doorsMs: 700, // the doors swinging open, flapping as they settle
    stepMs: 650, // the view stepping out through them onto the street
    countMs: 450, // each number of the countdown, 3, 2, 1
    drawMs: 220, // SHOOT! to the bandit's draw and shot
    boltMs: 140, // the bullet's flight into the view
    staggerMs: 600, // the view reeling from the hit
    tumbleMs: 500, // pitching forward into the hole opening in the road
    flyMs: 300, // the fall through the hole, until the floors fill it
    levelShare: 0.15, // free levels on the floor it lands on
  },
} as const satisfies EventMeta;
