import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Rate Lock",
  color: COLOR.blue,
  icon: "rateLock",
  description: "Locks this floor to at least 0.5x speed for 10s",
  chance: 0.08,
  values: {
    speedMultiplier: 0.5,
    durationMs: 10000,
  },
} satisfies ProcMeta;
