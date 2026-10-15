import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Rush Hour",
  color: COLOR.orange,
  icon: "sportscar",
  description: "Caps every floor's income timer at 0.5s for 15s",
  chance: 0.08,
  values: {
    intervalSeconds: 0.5,
    durationMs: 15000,
  },
} satisfies ProcMeta;
