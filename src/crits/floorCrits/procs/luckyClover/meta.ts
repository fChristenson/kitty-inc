import { COLOR } from "../../../../palette";
import { CONFIG } from "../../../../config";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Lucky Clover",
  color: COLOR.luckyCloverGreen,
  icon: "luckyClover",
  description:
    `Triggers 4 x${CONFIG.crit.ultra.multiplier} crits in succession`,
  chance: 0.004,
  values: {
    crits: 4,
  },
} satisfies ProcMeta;
