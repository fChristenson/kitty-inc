import type { EventMeta } from "../../eventMeta";

// drills bite into the bars one after another and punch through
export default {
  label: "Auger",
  style: "drill",
  reward: "levels",
  chance: 0.01,
  values: {
    approachMs: 260, // a drill's flight onto its bar
    boresMs: [620, 380] as [number, number], // each bore, quickening
    levelShare: 0.03, // per bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
