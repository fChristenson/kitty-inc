import type { EventMeta } from "../../eventMeta";

// a drill grinds into the clicked floor's Lvl label, every shove ticking it
// up
export default {
  label: "Countersink",
  style: "drill",
  reward: "levels",
  chance: 0.01,
  values: {
    approachMs: 280, // the drill screaming down
    stallMs: 750, // grinding in place on the label
    boreMs: 1500, // boring through once it gives
    pushShare: 0.01, // levels per shove
    levelShare: 0.05, // levels on the punch-through
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
