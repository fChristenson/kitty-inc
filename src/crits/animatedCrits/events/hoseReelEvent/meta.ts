import type { EventMeta } from "../../eventMeta";

// a wisp unreels a looping hose of cash and reels it in
export default {
  label: "Hose Reel",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    unreelMs: 1100,
    reelMs: 550,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
