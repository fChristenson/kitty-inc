import type { EventMeta } from "../../eventMeta";

// the floors zoom away into a dash down a server-room aisle, the player wisp
// snuffing red error lights on the racks, each a worker's perma tier, then
// overloading the mainframe at its end and bursting back out onto the floors
export default {
  label: "Server Room",
  style: "fps",
  reward: "perma tiers",
  chance: 0.01,
  values: {
    zoomMs: 450, // the floors zooming away into the dark aisle
    runMs: 2700, // the dash down the aisle, snuffing errors, to the last volley
    holdMs: 220, // the mainframe's blast before the rush back out
    flyMs: 250, // the rush at the opening, until the floors behind it come close
    promoteGapMs: 60, // between workers' celebrations once back on the floors
  },
} as const satisfies EventMeta;
