import type { EventMeta } from "../../eventMeta";

// the rare "Bullseye" event: bullseyes pop up over the screen and the button
// shoots the wisp into each, every hit spraying coins that then sweep into
// the total
export default {
  label: "Bullseye",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    popMs: 220, // each target popping up
    aimMs: 110, // the sight on the first target before the first shot
    travelMs: 90, // each shot's flight from the button
    gapMs: [260, 120] as [number, number], // between shots, quickening
    holdMs: 450, // after the last hit, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
