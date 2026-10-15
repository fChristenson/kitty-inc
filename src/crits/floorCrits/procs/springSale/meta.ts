import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Spring Sale",
  color: COLOR.springSalePink,
  icon: "spring",
  description: "Cuts upgrade/worker costs 25% building-wide",
  chance: 0.04,
  values: {
    // 0.25 = 25% off; procs multiply the affected cost by 1 - this
    discount: 0.25,
  },
} satisfies ProcMeta;
