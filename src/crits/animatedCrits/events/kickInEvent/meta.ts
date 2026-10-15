import type { EventMeta } from "../../eventMeta";

// the floors' screen is kicked flat like a door; the view storms two rooms of
// guards, kicking the door between them down, a big one last; the last door
// goes down on the floors and every bar in view climbs a crit tier
export default {
  label: "Kick In",
  style: "fps",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    flyMs: 0, // the dive through the last door is the landing
    tierGapMs: 70, // between the bars' crit tiers, top to bottom
  },
} as const satisfies EventMeta;
