import type { EventMeta } from "../../eventMeta";

// the rare "Yo-Yo" event: the wisp yo-yos from the total down onto the button
// and back, ever faster, then snaps into the total and explodes
export default {
  label: "Yo-Yo",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    throwMs: [440, 220] as [number, number], // each throw down and back, quickening
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
