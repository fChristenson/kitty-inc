import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Easter Sale",
  color: COLOR.easterSalePink,
  icon: "easterBunny",
  description: "Cuts upgrade/worker costs 50% building-wide",
  chance: 0.02,
  values: {
    discount: 0.5,
  },
} satisfies ProcMeta;
