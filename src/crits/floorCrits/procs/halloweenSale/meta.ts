import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Halloween Sale",
  color: COLOR.purple,
  icon: "halloween",
  description: "Cuts upgrade/worker costs 50% building-wide",
  chance: 0.02,
  values: {
    // 0.5 = 50% off — double the seasonal sales' own 25%
    discount: 0.5,
  },
} satisfies ProcMeta;
