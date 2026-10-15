import type { EventMeta } from "../../eventMeta";

// tentacles of cash rip the locked floor open
export default {
  label: "Tentacles",
  style: "mix",
  reward: "an unlock + cash",
  chance: 0.01,
  values: {
    riseMs: 300, // the wisp rising under the floor
    gapsMs: [220, 120] as [number, number], // between tentacles, quickening
    reachMs: 300, // each tentacle's lash up to its grip
    heaveMs: 400, // all of them heaving before it rips
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
