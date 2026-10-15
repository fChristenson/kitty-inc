import type { EventMeta } from "../../eventMeta";

// a beam burns a keyhole into the locked floor
export default {
  label: "Keyhole",
  style: "beam",
  reward: "an unlock",
  chance: 0.01,
  values: {
    riseMs: 250, // the emitter rising
    traceMs: 800, // the outline burned
    flyMs: 250, // the key flying in
    clicksMs: [220, 200, 260], // before each click; the last opens it
    holdMs: 300,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
