import type { EventMeta } from "../../eventMeta";

// the rare "Spray" event: like Burst, but the button sprays a stream sweeping
// round it instead of one explosion
export default {
  label: "Spray",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    streamMs: 500, // how long the stream sprays
    durationMs: 1_500, // stream, ~0.3s last coin out, 0.2s hang, then the merge
    mergeMs: 500,
  },
} as const satisfies EventMeta;
