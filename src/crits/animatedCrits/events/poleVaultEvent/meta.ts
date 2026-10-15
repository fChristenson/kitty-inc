import type { EventMeta } from "../../eventMeta";

// a wisp sprints a river of cash and vaults into the locked floor
export default {
  label: "Pole Vault",
  style: "mix",
  reward: "unlock + cash",
  chance: 0.01,
  values: {
    streamMs: 900, // the river pouring
    travelMs: 1_400, // the run and the vault
    holdMs: 500,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
