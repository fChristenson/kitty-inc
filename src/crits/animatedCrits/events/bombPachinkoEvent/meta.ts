import type { EventMeta } from "../../eventMeta";

// bombs rattle down a peg field and blow along the bottom
export default {
  label: "Bomb Pachinko",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    dropGapMs: 60,
    rowMs: 100,
    chainMs: 55,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
