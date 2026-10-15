import type { EventMeta } from "../../eventMeta";

// the floors zoom away and the wisp streaks up a narrow canyon at full speed,
// weaving between rushing rock walls; its side shots blow gun pods off the
// walls one by one, each landing perma tiers, the pods coming faster as the
// canyon narrows; a glowing barrier gate seals the end, cracking and
// throbbing faster under fire, until one last volley bursts it and the wisp
// shoots through the gap back onto the floors
export default {
  label: "Canyon Run",
  style: "shmup",
  reward: "perma tiers",
  chance: 0.01,
  values: {
    enterMs: 400, // the floors zooming away below
    flyMs: 3700, // the run, until the floors rush up
    pods: 10, // gun pods on the walls, each landing perma tiers
    podFromMs: 150, // the first pod blown off the wall
    podGapMs: [230, 110], // between pods, first to last as the canyon narrows
    brakeAtMs: 1800, // the gate coming into view, the run braking hard
    brakeMs: 350, // until the gate seals the canyon ahead
    gateHitFromMs: 2200, // the wisp's shots starting to crack the gate
    fireAtMs: 2850, // the last volley
    leaveAtMs: 3150, // the wisp streaking off the top through the gap
    maxTiersPerWorker: 2, // perma tiers a worker can take over the whole run
    promoteGapMs: 60, // between the workers' boosts once back on the floors
  },
} as const satisfies EventMeta;
