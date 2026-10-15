import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Shareholders",
  color: COLOR.shareholdersGreen,
  icon: "shareholders",
  description: "Pays 1% of income per staffing unit",
  chance: 0.02,
} satisfies ProcMeta;
