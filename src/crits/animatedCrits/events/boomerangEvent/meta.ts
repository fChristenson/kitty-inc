import type { EventMeta } from "../../eventMeta";

// the rare "Boomerang" event: the wisp is hurled out on wide loops that whip
// back into the button, shedding coins all along them, until the last catch
// blasts and the coins sweep in
export default {
  label: "Boomerang",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    throwMs: [560, 380] as [number, number], // each loop out and back, quickening
    holdMs: 450, // after the last catch, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
