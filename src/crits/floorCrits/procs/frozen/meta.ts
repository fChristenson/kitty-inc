import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Frozen",
  color: COLOR.frozenIceBlue,
  icon: "icecube",
  description: "Locks this floor's upgrade price for 15s",
  chance: 0.09,
  values: {
    durationMs: 5000,
  },
} satisfies ProcMeta;
