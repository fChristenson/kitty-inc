import type { EventMeta } from "../../eventMeta";

// the floors' screen slides aside like a train's door; the view sprints down
// a speeding night train, each carriage's door opening on a guard it drops, a
// big one last; the end door opens on the floors and every worker in view
// climbs a perma tier
export default {
  label: "Night Train",
  style: "fps",
  reward: "perma tiers",
  chance: 0.01,
  values: {
    slideMs: 250, // the floors' screen sliding aside
    flyMs: 0, // the dive through the end door is the landing
    promoteGapMs: 60, // between the workers' perma tiers
  },
} as const satisfies EventMeta;
