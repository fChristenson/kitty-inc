import type { EventMeta } from "../../eventMeta";

// the floors zoom away and a colossal saucer looms down over the wisp, its
// underside ringed with glowing hatches; they open in quickening waves and
// spit drone wisps diving at it, which it weaves through and shoots down,
// each wave cleared landing perma tiers; the saucer's core opens, throbbing
// faster, and sweeps a beam the wisp dodges, until its charged volley pierces
// the core and the saucer breaks apart in a chain of blasts, the view diving
// back onto the floors
export default {
  label: "Mothership",
  style: "shmup",
  reward: "perma tiers",
  chance: 0.01,
  values: {
    enterMs: 400, // the floors zooming away below
    flyMs: 3750, // the fight, until the floors rush up
    loomMs: 380, // the saucer looming down from the top
    waveAtMs: [420, 860, 1220, 1520], // each wave of hatches opening, quicker each time
    waveDrones: [3, 4, 5, 6], // drones spat out a wave
    droneGapMs: [120, 95, 75, 60], // between a wave's drones, first wave to last
    killAfterMs: [300, 280, 260, 240], // a drone's dive until it's shot down
    coreOpenAtMs: 2080, // the core opening, throbbing ever faster
    beamFromMs: 2280, // the core's beam firing, sweeping after the wisp
    beamToMs: 2820, // the beam cutting out
    fireAtMs: 2900, // the wisp's charged volley
    leaveAtMs: 3300, // the wisp streaking off the top
    maxTiersPerWorker: 2, // perma tiers a worker can take over the whole fight
    promoteGapMs: 60, // between the workers' boosts once back on the floors
  },
} as const satisfies EventMeta;
