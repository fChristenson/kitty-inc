import type { EventMeta } from "../../eventMeta";

// the floors zoom away into a night street: the getaway-car wisp tears off,
// its trunk spilling coins, a flashing red-blue chaser on its tail; it brakes
// into hairpins round the blocks and powers out, a sack of cash flung off the
// back at every exit bursting into paying coins, the corners coming quicker;
// on the last straight it jumps a gap the chaser can't and lands through the
// finish gate onto the floors in the big blast, paying the most
export default {
  label: "Getaway",
  style: "road race",
  reward: "cash",
  chance: 0.01,
  values: {
    enterMs: 250, // the floors zooming away into the chase
    flyMs: 3550, // the chase, until the finish gate's window is close
    firstBendMs: 450, // braking into the first hairpin, from the click
    bendsMs: [420, 370, 320, 280], // each hairpin, quicker each time
    gapsMs: [330, 260, 210], // the straights between hairpins
    straightMs: 430, // the last hairpin's exit to the ramp's lip
    airMs: 520, // the jump over the gap
    mergeMs: 700, // the car shooting through the gate's window, the floors filling the screen
    payoutsPerSack: 0.6, // the floor's payouts each sack pays
    payoutsFinish: 3, // the floor's payouts the finish pays
  },
} as const satisfies EventMeta;
