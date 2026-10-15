import type { EventMeta } from "../../eventMeta";

// the view lifts off into space; drone trains snake in, faster and denser,
// and the ship shoots each down; every train wiped drops a capsule the ship
// swoops up to grab, gaining an orbiting option that copies its fire and
// landing perma tiers; with four options it charges and fires one huge
// combined spread through a wall of drones in a chain of blasts, then the
// view dives back onto the floors
export default {
  label: "Power-Up",
  style: "shmup",
  reward: "perma tiers",
  chance: 0.01,
  values: {
    enterMs: 400, // the view lifting off the floors
    flyMs: 3950, // the fight, until the floors rush up (5s from the click to the crash)
    waveAtMs: [60, 720, 1260, 1720], // each drone train snaking in, quicker each time
    grabMs: 260, // a wiped train's capsule until the ship grabs it
    wallAtMs: 2450, // the final wall of drones dropping in
    fireAtMs: 3080, // the ship and its options firing their combined spread
    leaveAtMs: 3500, // the ship streaking off the top
    promoteGapMs: 60, // between the workers' boosts once back on the floors
  },
} as const satisfies EventMeta;
