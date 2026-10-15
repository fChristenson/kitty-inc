import type { EventMeta } from "../../eventMeta";

// the rare "Press" event: two glowing plates slam the clicked floor's income
// bar, bouncing off it, then grind it flat until it explodes out, bursting
// coins into the total
export default {
  label: "Press",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    slamMs: 140, // slamming in from off the screen
    bounceMs: 150, // bouncing back off the bar
    reslamMs: 100, // each slam after a bounce
    grindMs: 380, // grinding it down until it's almost gone
    retractMs: 220, // the plates thrown back off the screen by the blast
    holdMs: 450, // the coins hanging after the blast
    mergeMs: 500,
  },
} as const satisfies EventMeta;
