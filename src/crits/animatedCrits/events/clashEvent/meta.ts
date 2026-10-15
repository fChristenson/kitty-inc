import type { EventMeta } from "../../eventMeta";

// the rare "Clash" event: two wisps streak in and fight like fish in the
// middle of the screen, slamming again and again, until one last charged slam
// blasts them into coins that sweep in
export default {
  label: "Clash",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    entryMs: 380, // streaking in from off screen to the first slam
    roundMs: [400, 250] as [number, number], // each bounce and slam, quickening
    finalMs: 750, // backing off, winding up and charging the last slam
    holdMs: 450, // after the last slam, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
