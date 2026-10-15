import type { EventMeta } from "../../eventMeta";

// the rare "Reveal" event: on the reveal stage, a wisp bumps the silhouette
// of a badge never landed into a spin that flips it to the badge's art, and
// then that crit lands on the floor
export default {
  label: "Reveal",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    flyMs: 750, // the wisp swooping in from off screen to over the badge
    hoverMs: 250, // it hovering there
    bumpMs: 380, // it dipping to bump the badge's head and bouncing back up
    spinUpMs: 600, // the shadow spinning ever faster until it flips to the art
    correctMs: 500, // the art's spins overshooting, then turning back to face front
    holdMs: 300, // the settled badge and its name
  },
} as const satisfies EventMeta;
