import type { EventMeta } from "../../eventMeta";

// the floors' screen slides apart like lift doors; at each stop the doors
// open on a guard the pistol drops, the car rattling up between, a big one
// last; the last doors open on the floors and blow the locked floor's lock
export default {
  label: "Lift Ride",
  style: "fps",
  reward: "a free floor",
  chance: 0.01,
  values: {
    openMs: 200, // the doors sliding open or shut
    rideMs: 260, // the car rattling up between stops
    flyMs: 0, // the last doors open as the flight starts; then the landing
  },
} as const satisfies EventMeta;
