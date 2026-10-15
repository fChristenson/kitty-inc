import type { EventMeta } from "../../eventMeta";

// the rare "Spark Chain" event: a light jumps like lightning worker to
// worker, faster each jump, each struck worker climbing one perma tier, until
// it fizzles on the first maxed one
export default {
  label: "Spark Chain",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    firstJumpMs: 550, // the first jump, flight plus rest on the worker
    speedUp: 0.82, // each jump takes this much of the one before
    maxJumps: 10,
    holdMs: 600, // after the last strike, before the screen unfreezes
  },
} as const satisfies EventMeta;
