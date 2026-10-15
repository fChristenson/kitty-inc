import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Performance Bonus",
  color: COLOR.blue,
  icon: "performanceBonus",
  description: "Completes one timer per worker and manager",
  chance: 0.06,
} satisfies ProcMeta;
